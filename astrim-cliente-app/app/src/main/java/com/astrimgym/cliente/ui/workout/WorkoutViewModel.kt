package com.astrimgym.cliente.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.CompletedSet
import com.astrimgym.cliente.data.repository.WorkoutExercise
import com.astrimgym.cliente.data.repository.WorkoutRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import kotlin.math.ceil

enum class WorkoutPhase { LOADING, ERROR, EXERCISE, REST, EXERCISE_DONE, FINISHED }

data class WorkoutUiState(
    val phase: WorkoutPhase = WorkoutPhase.LOADING,
    val errorMessage: String? = null,
    val routineName: String = "",
    val exercises: List<WorkoutExercise> = emptyList(),
    val exerciseIndex: Int = 0,
    val setNumber: Int = 1,
    val weight: Double? = null,
    val reps: Int? = null,
    val restRemaining: Int = 0,
    val restTotal: Int = 0,
    val betweenExercises: Boolean = false,
    val completedSets: List<CompletedSet> = emptyList(),
    val elapsedSeconds: Long = 0,
    /** Segundos en el ejercicio actual (para el cronómetro de cardio). */
    val exerciseElapsedSeconds: Long = 0,
    val paused: Boolean = false,
    val saving: Boolean = false,
) {
    val currentExercise: WorkoutExercise? get() = exercises.getOrNull(exerciseIndex)
    val totalExercises: Int get() = exercises.size
    val isLastExercise: Boolean get() = exerciseIndex >= exercises.lastIndex
    val totalVolume: Double get() = completedSets.sumOf { (it.weight ?: 0.0) * (it.reps ?: 0) }
}

/** Eventos de una sola vez para la UI (sonido + vibración al terminar un descanso). */
object RestFinished

class WorkoutViewModel(
    private val repo: WorkoutRepository,
    private val routineId: String,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutUiState())
    val uiState: StateFlow<WorkoutUiState> = _uiState.asStateFlow()

    private val _events = Channel<RestFinished>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    private var startedAtMillis = 0L
    private var pausedAccumMillis = 0L
    private var pauseStartedAt = 0L
    private var restEndsAt = 0L
    private var restRemainingAtPause = 0
    /** Valor de `elapsedSeconds` cuando empezó el ejercicio en curso. */
    private var exerciseStartElapsed = 0L

    init {
        load()
        startTicker()
    }

    private fun load() {
        viewModelScope.launch {
            repo.loadExercises(routineId)
                .onSuccess { (name, exercises) ->
                    startedAtMillis = System.currentTimeMillis()
                    val first = exercises.first()
                    _uiState.value = WorkoutUiState(
                        phase = WorkoutPhase.EXERCISE,
                        routineName = name,
                        exercises = exercises,
                        exerciseIndex = 0,
                        setNumber = 1,
                        weight = first.targetWeight,
                        reps = first.targetReps,
                    )
                }
                .onFailure {
                    _uiState.value = WorkoutUiState(
                        phase = WorkoutPhase.ERROR,
                        errorMessage = it.message ?: "No se pudo cargar el entrenamiento.",
                    )
                }
        }
    }

    private fun startTicker() {
        viewModelScope.launch {
            while (true) {
                delay(250)
                val s = _uiState.value
                if (s.phase == WorkoutPhase.FINISHED || s.phase == WorkoutPhase.LOADING || s.phase == WorkoutPhase.ERROR) continue
                if (s.paused) continue

                val now = System.currentTimeMillis()
                val elapsed = (now - startedAtMillis - pausedAccumMillis) / 1000

                if (s.phase == WorkoutPhase.REST) {
                    val remaining = ceil((restEndsAt - now) / 1000.0).toInt()
                    if (remaining <= 0) {
                        _events.trySend(RestFinished)
                        onRestFinished()
                    } else {
                        _uiState.value = s.copy(elapsedSeconds = elapsed, restRemaining = remaining)
                    }
                } else {
                    _uiState.value = s.copy(
                        elapsedSeconds = elapsed,
                        exerciseElapsedSeconds = (elapsed - exerciseStartElapsed).coerceAtLeast(0),
                    )
                }
            }
        }
    }

    // ---- ajustes de la serie en curso ----
    fun changeWeight(delta: Double) {
        val v = ((_uiState.value.weight ?: 0.0) + delta).coerceAtLeast(0.0)
        _uiState.value = _uiState.value.copy(weight = v)
    }

    fun changeReps(delta: Int) {
        val v = ((_uiState.value.reps ?: 0) + delta).coerceAtLeast(0)
        _uiState.value = _uiState.value.copy(reps = v)
    }

    // ---- flujo principal ----
    fun completeSet() {
        val s = _uiState.value
        val ex = s.currentExercise ?: return

        val logged = CompletedSet(
            exerciseId = ex.exerciseId,
            exerciseName = ex.name,
            setNumber = s.setNumber,
            weight = s.weight,
            reps = s.reps,
        )
        val updatedSets = s.completedSets + logged

        if (s.setNumber < ex.targetSets) {
            // Quedan series: descanso automático entre series.
            enterRest(seconds = ex.restSeconds, between = false, nextState = s.copy(completedSets = updatedSets))
        } else {
            // Última serie del ejercicio.
            _uiState.value = s.copy(
                completedSets = updatedSets,
                phase = WorkoutPhase.EXERCISE_DONE,
            )
        }
    }

    fun nextExerciseFromDone() {
        val s = _uiState.value
        if (s.isLastExercise) {
            _uiState.value = s.copy(phase = WorkoutPhase.FINISHED)
            return
        }
        val rest = WorkoutRepository.BETWEEN_EXERCISES_SECONDS
        if (rest > 0) {
            enterRest(seconds = rest, between = true, nextState = s)
        } else {
            advanceToNextExercise()
        }
    }

    fun addRest(seconds: Int) {
        if (_uiState.value.phase != WorkoutPhase.REST) return
        restEndsAt += seconds * 1000L
        _uiState.value = _uiState.value.copy(
            restTotal = (_uiState.value.restTotal + seconds).coerceAtLeast(0),
        )
    }

    fun skipRest() {
        if (_uiState.value.phase == WorkoutPhase.REST) onRestFinished()
    }

    fun togglePause() {
        val s = _uiState.value
        if (s.paused) {
            pausedAccumMillis += System.currentTimeMillis() - pauseStartedAt
            if (s.phase == WorkoutPhase.REST) {
                restEndsAt = System.currentTimeMillis() + restRemainingAtPause * 1000L
            }
            _uiState.value = s.copy(paused = false)
        } else {
            pauseStartedAt = System.currentTimeMillis()
            restRemainingAtPause = s.restRemaining
            _uiState.value = s.copy(paused = true)
        }
    }

    fun finishNow() {
        _uiState.value = _uiState.value.copy(phase = WorkoutPhase.FINISHED)
    }

    /** Guarda la sesión en Firestore. Se llama una vez desde la pantalla de resumen. */
    fun saveSession(onDone: () -> Unit) {
        val s = _uiState.value
        if (s.completedSets.isEmpty()) { onDone(); return }
        _uiState.value = s.copy(saving = true)
        viewModelScope.launch {
            repo.saveSession(
                routineId = routineId,
                routineName = s.routineName,
                startedAtMillis = startedAtMillis,
                endedAtMillis = System.currentTimeMillis(),
                sets = s.completedSets,
            )
            _uiState.value = _uiState.value.copy(saving = false)
            onDone()
        }
    }

    // ---- helpers de estado ----
    private fun enterRest(seconds: Int, between: Boolean, nextState: WorkoutUiState) {
        restEndsAt = System.currentTimeMillis() + seconds * 1000L
        _uiState.value = nextState.copy(
            phase = WorkoutPhase.REST,
            betweenExercises = between,
            restTotal = seconds,
            restRemaining = seconds,
        )
    }

    private fun onRestFinished() {
        val s = _uiState.value
        if (s.betweenExercises) {
            advanceToNextExercise()
        } else {
            // Siguiente serie del mismo ejercicio.
            _uiState.value = s.copy(
                phase = WorkoutPhase.EXERCISE,
                setNumber = s.setNumber + 1,
                betweenExercises = false,
            )
        }
    }

    private fun advanceToNextExercise() {
        val s = _uiState.value
        val nextIndex = s.exerciseIndex + 1
        val next = s.exercises[nextIndex]
        exerciseStartElapsed = s.elapsedSeconds
        _uiState.value = s.copy(
            phase = WorkoutPhase.EXERCISE,
            exerciseIndex = nextIndex,
            setNumber = 1,
            weight = next.targetWeight,
            reps = next.targetReps,
            exerciseElapsedSeconds = 0,
            betweenExercises = false,
        )
    }
}
