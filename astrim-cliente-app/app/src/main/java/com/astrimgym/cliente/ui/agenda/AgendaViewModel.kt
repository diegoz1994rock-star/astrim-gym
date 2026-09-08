package com.astrimgym.cliente.ui.agenda

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.AgendaData
import com.astrimgym.cliente.data.repository.AgendaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

sealed interface AgendaUiState {
    data object Loading : AgendaUiState
    data class Success(
        val data: AgendaData,
        val visibleMonth: YearMonth,
        val selectedDay: LocalDate,
    ) : AgendaUiState
    data class Error(val message: String) : AgendaUiState
}

class AgendaViewModel(private val repo: AgendaRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<AgendaUiState>(AgendaUiState.Loading)
    val uiState: StateFlow<AgendaUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = AgendaUiState.Loading
            repo.loadAgenda()
                .onSuccess {
                    val today = LocalDate.now()
                    _uiState.value = AgendaUiState.Success(it, YearMonth.from(today), today)
                }
                .onFailure {
                    _uiState.value = AgendaUiState.Error(it.message ?: "No se pudo cargar tu agenda.")
                }
        }
    }

    fun selectDay(day: LocalDate) {
        val s = _uiState.value as? AgendaUiState.Success ?: return
        _uiState.value = s.copy(selectedDay = day, visibleMonth = YearMonth.from(day))
    }

    fun changeMonth(delta: Long) {
        val s = _uiState.value as? AgendaUiState.Success ?: return
        _uiState.value = s.copy(visibleMonth = s.visibleMonth.plusMonths(delta))
    }
}
