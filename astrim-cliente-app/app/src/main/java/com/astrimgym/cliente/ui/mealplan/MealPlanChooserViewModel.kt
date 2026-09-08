package com.astrimgym.cliente.ui.mealplan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.AssignedMealPlanSummary
import com.astrimgym.cliente.data.repository.MealPlanRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface MealPlanChooserUiState {
    data object Loading : MealPlanChooserUiState
    data class Error(val message: String) : MealPlanChooserUiState
    data class Success(val plans: List<AssignedMealPlanSummary>) : MealPlanChooserUiState
}

/** Lista de TODOS los planes de alimentación asignados al cliente — puede tener más de uno a la vez. */
class MealPlanChooserViewModel(private val repo: MealPlanRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<MealPlanChooserUiState>(MealPlanChooserUiState.Loading)
    val uiState: StateFlow<MealPlanChooserUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = MealPlanChooserUiState.Loading
            repo.listAssignedPlans()
                .onSuccess { _uiState.value = MealPlanChooserUiState.Success(it) }
                .onFailure {
                    _uiState.value = MealPlanChooserUiState.Error(
                        it.message ?: "No se pudieron cargar tus planes de alimentación.",
                    )
                }
        }
    }
}
