package com.astrimgym.cliente.ui.mealplan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.ActiveMealPlan
import com.astrimgym.cliente.data.repository.MEAL_TYPE_ORDER
import com.astrimgym.cliente.data.repository.Macros
import com.astrimgym.cliente.data.repository.MealLogEntry
import com.astrimgym.cliente.data.repository.MealLogRepository
import com.astrimgym.cliente.data.repository.MealPlanRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Momentos del día que siempre se muestran, aunque el cliente no haya cargado nada todavía. */
val ALWAYS_VISIBLE_MEAL_TYPES: Set<String> = setOf("DESAYUNO", "ALMUERZO", "CENA")

sealed interface MealPlanSummaryUiState {
    data object Loading : MealPlanSummaryUiState
    data class Error(val message: String) : MealPlanSummaryUiState
    data class Success(
        val plan: ActiveMealPlan,
        val today: LocalDate,
        val entriesByMealType: Map<String, List<MealLogEntry>>,
        val todayTotals: Macros,
        val categoryLoggedToday: Map<String, Double>,
    ) : MealPlanSummaryUiState
}

/** Detalle de UN plan puntual — `mealPlanId` llega por navegación desde la lista de planes asignados. */
class MealPlanListViewModel(
    private val mealPlanRepository: MealPlanRepository,
    private val mealLogRepository: MealLogRepository,
    private val mealPlanId: String,
) : ViewModel() {
    private val _uiState = MutableStateFlow<MealPlanSummaryUiState>(MealPlanSummaryUiState.Loading)
    val uiState: StateFlow<MealPlanSummaryUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = MealPlanSummaryUiState.Loading
            mealPlanRepository.getPlanDetail(mealPlanId)
                .onSuccess { plan -> loadToday(plan) }
                .onFailure {
                    _uiState.value = MealPlanSummaryUiState.Error(
                        it.message ?: "No se pudo cargar tu plan de alimentación.",
                    )
                }
        }
    }

    fun deleteEntry(entryId: String) {
        viewModelScope.launch {
            mealLogRepository.deleteEntry(entryId)
            refresh()
        }
    }

    private suspend fun loadToday(plan: ActiveMealPlan) {
        val today = LocalDate.now()
        mealLogRepository.entriesForDate(today, mealPlanId)
            .onSuccess { entries ->
                val byMealType = MEAL_TYPE_ORDER.associate { (key, _) -> key to entries.filter { it.mealType == key } }
                val totals = Macros(
                    calories = entries.sumOf { it.calories },
                    protein = entries.sumOf { it.protein },
                    carbs = entries.sumOf { it.carbs },
                    fat = entries.sumOf { it.fat },
                )
                val categoryLogged = entries.groupBy { it.category }.mapValues { (_, v) -> v.sumOf { it.quantity } }
                _uiState.value = MealPlanSummaryUiState.Success(
                    plan = plan,
                    today = today,
                    entriesByMealType = byMealType,
                    todayTotals = totals,
                    categoryLoggedToday = categoryLogged,
                )
            }
            .onFailure {
                _uiState.value = MealPlanSummaryUiState.Error(
                    it.message ?: "No se pudieron cargar tus comidas de hoy.",
                )
            }
    }
}
