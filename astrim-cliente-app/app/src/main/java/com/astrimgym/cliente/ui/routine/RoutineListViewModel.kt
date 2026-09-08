package com.astrimgym.cliente.ui.routine

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.AssignedRoutine
import com.astrimgym.cliente.data.repository.RoutineRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface RoutineListUiState {
    data object Loading : RoutineListUiState
    data class Success(
        val current: List<AssignedRoutine>,
        val history: List<AssignedRoutine>,
    ) : RoutineListUiState
    data class Error(val message: String) : RoutineListUiState
}

class RoutineListViewModel(private val repo: RoutineRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<RoutineListUiState>(RoutineListUiState.Loading)
    val uiState: StateFlow<RoutineListUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = RoutineListUiState.Loading
            repo.listAssignedRoutines()
                .onSuccess { all ->
                    _uiState.value = RoutineListUiState.Success(
                        current = all.filter { it.status == "ACTIVE" },
                        history = all.filter { it.status != "ACTIVE" },
                    )
                }
                .onFailure {
                    _uiState.value = RoutineListUiState.Error(
                        it.message ?: "No se pudieron cargar tus rutinas.",
                    )
                }
        }
    }
}
