package com.astrimgym.cliente.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.CompletedSet
import com.astrimgym.cliente.data.repository.ExerciseMeta
import com.astrimgym.cliente.data.repository.SaveOutcome
import com.astrimgym.cliente.data.repository.WorkoutDataSource
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

/** Estado del guardado de la sesión en el resumen final. */
enum class SaveStatus {
    IDLE,
    SAVING,
    /** Confirmado por el servidor. */
    SAVED,
    /** Guardado en el teléfono; se sincroniza solo al volver la conexión. */
    QUEUED,
    ERROR,
    /** No hubo series: por regla no se guarda una sesión vacía. */
    SKIPPED,
}

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
    val saveStatus: SaveStatus = SaveStatus.IDLE,
    /** Grupo muscular / video por exerciseId; se completa en segundo plano. */
    val meta: Map<String, ExerciseMeta> = emptyMap(),
) {
    val currentExercise: WorkoutExercise? get() = exercises.getOrNull(exerciseIndex)
    val nextExercise: WorkoutExercise? get() = exercises.getOrNull(exerciseIndex + 1)
    val totalExercises: Int get() = exercises.size
    val isLastExercise: Boolean get() = exerciseIndex >= exercises.lastIndex
    val totalVolume: Double get() = completedSets.sumOf { (it.weight ?: 0.0) * (it.reps ?: 0) }

    /** Series registradas del ejercicio en curso (por posición, no por id: una rutina puede repetir ejercicio). */
    val setsOfCurrentExercise: List<CompletedSet>
        get() {
            val ex = currentExercise ?: return emptyList()
            return completedSets.takeLast(setsDoneInCurrent).filter { it.exerciseId == ex.exerciseId }
        }

    /** Cuántas series del ejercicio actual ya están registradas, según la fase. */
    val setsDoneInCurrent: Int
        get() {
            val ex = currentExercise ?: return 0
            return when (phase) {
                WorkoutPhase.EXERCISE -> setNumber - 1
                WorkoutPhase.REST -> if (betweenExercises) ex.targetSets else setNumber
                WorkoutPhase.EXERCISE_DONE, WorkoutPhase.FINISHED -> ex.targetSets
                else -> 0
            }.coerceIn(0, ex.targetSets)
        }

    /**
     * Progreso real de la sesión (0..1): cada ejercicio pesa lo mismo y
     * dentro de él cuenta cada serie registrada. Fuerza y cardio usan la
     * misma regla (cardio = 1 "serie"), así no hay saltos al alternarlos.
     */
    val sessionProgress: Float
        get() {
            if (exercises.isEmpty()) return 0f
            if (phase == WorkoutPhase.FINISHED) return 1f
            val ex = currentExercise ?: return 0f
            val within = setsDoneInCurrent.toFloat() / ex.targetSets.coerceAtLeast(1)
            return ((exerciseIndex + within) / exercises.size).coerceIn(0f, 1f)
        }
}

/** Eventos de una sola vez para la UI (sonido + vibración al terminar un descanso). */
object RestFinished

class WorkoutViewModel(
    private val repo: WorkoutDataSource,
    private val routineId: String,
    private val now: () -> Long = System::currentTimeMillis,
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
    /** El guardado se dispara una sola vez por sesión (recomposiciones/rotación no duplican). */
    private var saveStarted = false
    private var finishedAtMillis = 0L
    private val metaRequested = HashSet<String>()

    init {
        load()
        startTicker()
    }

    private fun load() {
        viewModelScope.launch {
            repo.loadExercises(routineId)
                .onSuccess { (name, exercises) ->
                    startedAtMillis = now()
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
                    prefetchMeta()
                }
                .onFailure {
                    _uiState.value = WorkoutUiState(
                        phase = WorkoutPhase.ERROR,
                        errorMessage = it.message ?: "No se pudo cargar el entrenamiento.",
                    )
                }
        }
    }

    /** Pide la ficha visual del ejercicio actual y del siguiente (una vez cada uno). */
    private fun prefetchMeta() {
        val s = _uiState.value
        listOfNotNull(s.currentExercise, s.nextExercise).forEach { ex ->
            if (!metaRequested.add(ex.exerciseId)) return@forEach
            viewModelScope.launch {
                repo.loadExerciseMeta(ex.exerciseId).onSuccess { meta ->
                    _uiState.value = _uiState.value.let { it.copy(meta = it.meta + (ex.exerciseId to meta)) }
                }
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

                val t = now()
                val elapsed = (t - startedAtMillis - pausedAccumMillis) / 1000

                if (s.phase == WorkoutPhase.REST) {
                    val remaining = ceil((restEndsAt - t) / 1000.0).toInt()
                    if (remaining <= 0) {
                        _events.trySend(RestFinished)
                        onRestFinished()
                    } else if (remaining != s.restRemaining || elapsed != s.elapsedSeconds) {
                        _uiState.value = s.copy(elapsedSeconds = elapsed, restRemaining = remaining)
                    }
                } else {
                    val exElapsed = (elapsed - exerciseStartElapsed).coerceAtLeast(0)
                    if (elapsed != s.elapsedSeconds || exElapsed != s.exerciseElapsedSeconds) {
                        _uiState.value = s.copy(elapsedSeconds = elapsed, exerciseElapsedSeconds = exElapsed)
                    }
                }
            }
        }
    }

    // ---- ajustes de la serie en curso ----
    fun changeWeight(delta: Double) {
        val s = _uiState.value
        if (s.phase != WorkoutPhase.EXERCISE) return
        val v = ((s.weight ?: 0.0) + delta).coerceAtLeast(0.0)
        _uiState.value = s.copy(weight = v)
    }

    fun changeReps(delta: Int) {
        val s = _uiState.value
        if (s.phase != WorkoutPhase.EXERCISE) return
        val v = ((s.reps ?: 0) + delta).coerceAtLeast(0)
        _uiState.value = s.copy(reps = v)
    }

    // ---- flujo principal ----

    /**
     * Registra la serie en curso. Solo actúa en la fase EXERCISE y sin
     * pausa: un segundo toque durante la transición hacia el descanso (o
     * desde la pantalla que se está desvaneciendo) no duplica la serie.
     */
    fun completeSet() {
        val s = _uiState.value
        if (s.phase != WorkoutPhase.EXERCISE || s.paused) return
        val ex = s.currentExercise ?: return

        val logged = CompletedSet(
            exerciseId = ex.exerciseId,
            exerciseName = ex.name,
            setNumber = s.setNumber,
            weight = if (ex.isCardio) null else s.weight,
            reps = if (ex.isCardio) null else s.reps,
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
        if (s.phase != WorkoutPhase.EXERCISE_DONE || s.paused) return
        if (s.isLastExercise) {
            finish()
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
        val s = _uiState.value
        if (s.phase != WorkoutPhase.REST || s.paused) return
        val t = now()
        // Nunca por debajo de 1 s restante: el ticker cierra el descanso.
        restEndsAt = maxOf(restEndsAt + seconds * 1000L, t + 1000L)
        val remaining = ceil((restEndsAt - t) / 1000.0).toInt()
        _uiState.value = s.copy(
            restRemaining = remaining,
            restTotal = maxOf(s.restTotal + seconds, remaining).coerceAtLeast(1),
        )
    }

    fun skipRest() {
        val s = _uiState.value
        if (s.phase == WorkoutPhase.REST && !s.paused) onRestFinished()
    }

    fun togglePause() {
        val s = _uiState.value
        if (s.phase == WorkoutPhase.FINISHED || s.phase == WorkoutPhase.LOADING || s.phase == WorkoutPhase.ERROR) return
        if (s.paused) {
            pausedAccumMillis += now() - pauseStartedAt
            if (s.phase == WorkoutPhase.REST) {
                restEndsAt = now() + restRemainingAtPause * 1000L
            }
            _uiState.value = s.copy(paused = false)
        } else {
            pauseStartedAt = now()
            restRemainingAtPause = s.restRemaining
            _uiState.value = s.copy(paused = true)
        }
    }

    /** Termina ya (desde pausa o la X): va al resumen y guarda lo registrado. */
    fun finishNow() {
        val s = _uiState.value
        if (s.phase == WorkoutPhase.FINISHED || s.phase == WorkoutPhase.LOADING) return
        if (s.paused) pausedAccumMillis += now() - pauseStartedAt
        finish()
    }

    /** Reintento manual desde el resumen si el guardado falló. */
    fun retrySave() {
        if (_uiState.value.saveStatus != SaveStatus.ERROR) return
        saveStarted = false
        persistSessionOnce()
    }

    // ---- helpers de estado ----
    private fun finish() {
        finishedAtMillis = now()
        val s = _uiState.value
        val elapsed = ((finishedAtMillis - startedAtMillis - pausedAccumMillis) / 1000).coerceAtLeast(s.elapsedSeconds)
        _uiState.value = s.copy(phase = WorkoutPhase.FINISHED, paused = false, elapsedSeconds = elapsed)
        persistSessionOnce()
    }

    /**
     * Guarda la sesión en Firestore una sola vez. Sin series no se guarda
     * (regla existente). El resultado queda visible en el resumen: nunca se
     * muestra "guardado" si falló.
     */
    private fun persistSessionOnce() {
        if (saveStarted) return
        saveStarted = true
        val s = _uiState.value
        if (s.completedSets.isEmpty()) {
            _uiState.value = s.copy(saveStatus = SaveStatus.SKIPPED)
            return
        }
        _uiState.value = s.copy(saveStatus = SaveStatus.SAVING)
        viewModelScope.launch {
            val result = repo.saveSession(
                routineId = routineId,
                routineName = s.routineName,
                startedAtMillis = startedAtMillis,
                endedAtMillis = finishedAtMillis,
                sets = s.completedSets,
            )
            val status = result.fold(
                onSuccess = { if (it == SaveOutcome.SYNCED) SaveStatus.SAVED else SaveStatus.QUEUED },
                onFailure = { SaveStatus.ERROR },
            )
            _uiState.value = _uiState.value.copy(saveStatus = status)
        }
    }

    private fun enterRest(seconds: Int, between: Boolean, nextState: WorkoutUiState) {
        restEndsAt = now() + seconds * 1000L
        _uiState.value = nextState.copy(
            phase = WorkoutPhase.REST,
            betweenExercises = between,
            restTotal = seconds,
            restRemaining = seconds,
        )
    }

    private fun onRestFinished() {
        val s = _uiState.value
        if (s.phase != WorkoutPhase.REST) return
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
        val next = s.exercises.getOrNull(nextIndex) ?: return finish()
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
        prefetchMeta()
    }
}
