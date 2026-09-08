package com.astrimgym.cliente.ui.routine

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.model.ExerciseDoc
import com.astrimgym.cliente.data.model.RoutineExerciseDoc
import com.astrimgym.cliente.data.repository.RoutineRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ExerciseDetailData(
    val exercise: ExerciseDoc,
    /** Config de este ejercicio en la rutina (series/reps/peso/descanso), si aplica. */
    val routineConfig: RoutineExerciseDoc?,
)

sealed interface ExerciseDetailUiState {
    data object Loading : ExerciseDetailUiState
    data class Success(val data: ExerciseDetailData) : ExerciseDetailUiState
    data class Error(val message: String) : ExerciseDetailUiState
}

class ExerciseDetailViewModel(
    private val repo: RoutineRepository,
    private val routineId: String,
    private val exerciseId: String,
) : ViewModel() {
    private val _uiState = MutableStateFlow<ExerciseDetailUiState>(ExerciseDetailUiState.Loading)
    val uiState: StateFlow<ExerciseDetailUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = ExerciseDetailUiState.Loading
            val exercise = repo.getExercise(exerciseId)
            if (exercise.isFailure) {
                _uiState.value = ExerciseDetailUiState.Error(
                    exercise.exceptionOrNull()?.message ?: "No se pudo cargar el ejercicio.",
                )
                return@launch
            }
            // La config de la rutina es opcional: si falla, igual mostramos la ficha.
            val config = repo.getRoutineDetail(routineId).getOrNull()
                ?.exercises?.firstOrNull { it.exerciseId == exerciseId }

            _uiState.value = ExerciseDetailUiState.Success(
                ExerciseDetailData(exercise = exercise.getOrThrow(), routineConfig = config),
            )
        }
    }
}
