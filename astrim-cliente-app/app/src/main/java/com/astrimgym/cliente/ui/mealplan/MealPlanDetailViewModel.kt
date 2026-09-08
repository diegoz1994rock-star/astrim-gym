package com.astrimgym.cliente.ui.mealplan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.ActiveMealPlan
import com.astrimgym.cliente.data.repository.AllowedFood
import com.astrimgym.cliente.data.repository.Macros
import com.astrimgym.cliente.data.repository.MealLogEntry
import com.astrimgym.cliente.data.repository.MealLogRepository
import com.astrimgym.cliente.data.repository.MealPlanRepository
import com.astrimgym.cliente.data.repository.computeMacros
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate

/** Paso del asistente de "agregar/editar alimento". */
enum class AddEntryStep { CATEGORY, FOOD, QUANTITY }

sealed interface AddEntryUiState {
    data object Loading : AddEntryUiState
    data class Error(val message: String) : AddEntryUiState
    data class Ready(
        val plan: ActiveMealPlan,
        val mealType: String,
        val isEditing: Boolean,
        val entryId: String?,
        val originalCreatedAt: String?,
        val step: AddEntryStep,
        val selectedCategory: String?,
        val selectedFood: AllowedFood?,
        val quantityText: String,
        /** Macros ya registrados hoy, EXCLUYENDO esta entrada si se está editando. */
        val alreadyLoggedToday: Macros,
        val saving: Boolean = false,
        val saveError: String? = null,
    ) : AddEntryUiState
}

/**
 * Maneja el asistente de 3 pasos (categoría -> alimento -> cantidad) para
 * registrar o editar un alimento consumido. Usa MealPlanRepository (whitelist
 * + metas) y MealLogRepository (lectura/escritura del registro del cliente).
 */
class MealPlanDetailViewModel(
    private val mealPlanRepository: MealPlanRepository,
    private val mealLogRepository: MealLogRepository,
    private val mealPlanId: String,
    private val initialMealType: String?,
    private val entryId: String?,
) : ViewModel() {
    private val _uiState = MutableStateFlow<AddEntryUiState>(AddEntryUiState.Loading)
    val uiState: StateFlow<AddEntryUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            _uiState.value = AddEntryUiState.Loading
            val planResult = mealPlanRepository.getPlanDetail(mealPlanId)
            planResult.onSuccess { plan ->
                if (plan.allowedFoods.isEmpty()) {
                    _uiState.value = AddEntryUiState.Error(
                        "Todavía no hay alimentos cargados en el catálogo.",
                    )
                    return@onSuccess
                }
                val today = LocalDate.now()
                mealLogRepository.entriesForDate(today, mealPlanId)
                    .onSuccess { todayEntries ->
                        if (entryId != null) {
                            val existing = todayEntries.find { it.id == entryId }
                            if (existing == null) {
                                _uiState.value = AddEntryUiState.Error("No encontramos este registro.")
                                return@onSuccess
                            }
                            val food = plan.allowedFoods.find { it.foodId == existing.foodId } ?: AllowedFood(
                                foodId = existing.foodId,
                                name = existing.foodName,
                                category = existing.category,
                                defaultUnit = existing.unit.ifBlank { "g" },
                                caloriesKcal = null,
                                proteinG = null,
                                carbsG = null,
                                fatG = null,
                            )
                            val already = sumMacros(todayEntries.filter { it.id != entryId })
                            _uiState.value = AddEntryUiState.Ready(
                                plan = plan,
                                mealType = existing.mealType,
                                isEditing = true,
                                entryId = entryId,
                                originalCreatedAt = existing.createdAt,
                                step = AddEntryStep.QUANTITY,
                                selectedCategory = food.category,
                                selectedFood = food,
                                quantityText = formatQuantity(existing.quantity),
                                alreadyLoggedToday = already,
                            )
                        } else {
                            val already = sumMacros(todayEntries)
                            val categories = plan.foodsByCategory.keys
                            val singleCategory = categories.singleOrNull()
                            _uiState.value = AddEntryUiState.Ready(
                                plan = plan,
                                mealType = initialMealType ?: "OTRO",
                                isEditing = false,
                                entryId = null,
                                originalCreatedAt = null,
                                step = if (singleCategory != null) AddEntryStep.FOOD else AddEntryStep.CATEGORY,
                                selectedCategory = singleCategory,
                                selectedFood = null,
                                quantityText = "",
                                alreadyLoggedToday = already,
                            )
                        }
                    }
                    .onFailure {
                        _uiState.value = AddEntryUiState.Error(it.message ?: "No se pudieron cargar tus comidas de hoy.")
                    }
            }.onFailure {
                _uiState.value = AddEntryUiState.Error(it.message ?: "No se pudo cargar tu plan de alimentación.")
            }
        }
    }

    fun selectCategory(category: String) {
        updateReady { it.copy(step = AddEntryStep.FOOD, selectedCategory = category, selectedFood = null, quantityText = "") }
    }

    fun selectFood(food: AllowedFood) {
        updateReady {
            it.copy(
                step = AddEntryStep.QUANTITY,
                selectedCategory = food.category,
                selectedFood = food,
                quantityText = defaultQuantityFor(food),
            )
        }
    }

    fun changeFood() {
        updateReady { it.copy(step = AddEntryStep.FOOD) }
    }

    fun setQuantity(text: String) {
        updateReady { it.copy(quantityText = text) }
    }

    /** Retrocede un paso del asistente; si ya está en CATEGORY, no hace nada (la pantalla debe cerrar). */
    fun goBackStep() {
        updateReady {
            when (it.step) {
                AddEntryStep.QUANTITY -> it.copy(step = AddEntryStep.FOOD)
                AddEntryStep.FOOD -> it.copy(step = AddEntryStep.CATEGORY)
                AddEntryStep.CATEGORY -> it
            }
        }
    }

    fun save(onSaved: () -> Unit) {
        val current = _uiState.value as? AddEntryUiState.Ready ?: return
        val food = current.selectedFood ?: return
        val quantity = current.quantityText.replace(',', '.').toDoubleOrNull()
        if (quantity == null || quantity <= 0) {
            _uiState.value = current.copy(saveError = "Ingresá una cantidad válida.")
            return
        }
        _uiState.value = current.copy(saving = true, saveError = null)
        viewModelScope.launch {
            val result = if (current.isEditing && current.entryId != null) {
                mealLogRepository.updateEntry(
                    entryId = current.entryId,
                    mealPlanId = current.plan.mealPlanId,
                    date = LocalDate.now(),
                    mealType = current.mealType,
                    food = food,
                    quantity = quantity,
                    createdAt = current.originalCreatedAt ?: Instant.now().toString(),
                )
            } else {
                mealLogRepository.addEntry(
                    mealPlanId = current.plan.mealPlanId,
                    date = LocalDate.now(),
                    mealType = current.mealType,
                    food = food,
                    quantity = quantity,
                )
            }
            result
                .onSuccess { onSaved() }
                .onFailure { e ->
                    updateReady { it.copy(saving = false, saveError = e.message ?: "No se pudo guardar. Intentá de nuevo.") }
                }
        }
    }

    private fun sumMacros(entries: List<MealLogEntry>): Macros = Macros(
        calories = entries.sumOf { it.calories },
        protein = entries.sumOf { it.protein },
        carbs = entries.sumOf { it.carbs },
        fat = entries.sumOf { it.fat },
    )

    /** Prefiere la porción de referencia en términos cotidianos (ej. "1 banano mediano" ≈ 120 g) sobre un genérico 100 g/ml. */
    private fun defaultQuantityFor(food: AllowedFood): String =
        food.referenceQty?.let(::formatQuantity)
            ?: if (food.defaultUnit == "g" || food.defaultUnit == "ml") "100" else "1"

    private fun formatQuantity(value: Double): String =
        if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

    private inline fun updateReady(transform: (AddEntryUiState.Ready) -> AddEntryUiState.Ready) {
        _uiState.update { current -> if (current is AddEntryUiState.Ready) transform(current) else current }
    }
}

/** Preview de macros para la cantidad actualmente tipeada (0 si no es un número válido). */
fun AddEntryUiState.Ready.previewQuantity(): Double =
    quantityText.replace(',', '.').toDoubleOrNull() ?: 0.0

fun AddEntryUiState.Ready.previewMacros(): Macros {
    val food = selectedFood ?: return Macros()
    return computeMacros(food, previewQuantity())
}
