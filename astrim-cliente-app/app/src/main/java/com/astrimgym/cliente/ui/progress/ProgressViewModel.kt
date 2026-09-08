package com.astrimgym.cliente.ui.progress

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.ProgressData
import com.astrimgym.cliente.data.repository.ProgressRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface ProgressUiState {
    data object Loading : ProgressUiState
    data class Success(val data: ProgressData) : ProgressUiState
    data class Error(val message: String) : ProgressUiState
}

class ProgressViewModel(private val repo: ProgressRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<ProgressUiState>(ProgressUiState.Loading)
    val uiState: StateFlow<ProgressUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = ProgressUiState.Loading
            repo.loadProgress()
                .onSuccess { _uiState.value = ProgressUiState.Success(it) }
                .onFailure {
                    _uiState.value = ProgressUiState.Error(it.message ?: "No se pudo cargar tu progreso.")
                }
        }
    }
}
