package com.astrimgym.cliente.ui.routine

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.RoutineDetail
import com.astrimgym.cliente.data.repository.RoutineRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface RoutineDetailUiState {
    data object Loading : RoutineDetailUiState
    data class Success(val detail: RoutineDetail) : RoutineDetailUiState
    data class Error(val message: String) : RoutineDetailUiState
}

class RoutineDetailViewModel(
    private val repo: RoutineRepository,
    private val routineId: String,
) : ViewModel() {
    private val _uiState = MutableStateFlow<RoutineDetailUiState>(RoutineDetailUiState.Loading)
    val uiState: StateFlow<RoutineDetailUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = RoutineDetailUiState.Loading
            repo.getRoutineDetail(routineId)
                .onSuccess { _uiState.value = RoutineDetailUiState.Success(it) }
                .onFailure {
                    _uiState.value = RoutineDetailUiState.Error(
                        it.message ?: "No se pudo cargar la rutina.",
                    )
                }
        }
    }
}
