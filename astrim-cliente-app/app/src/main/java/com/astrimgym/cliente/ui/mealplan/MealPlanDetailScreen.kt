package com.astrimgym.cliente.ui.mealplan

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.repository.AllowedFood
import com.astrimgym.cliente.data.repository.Macros
import com.astrimgym.cliente.data.repository.MealLogRepository
import com.astrimgym.cliente.data.repository.MealPlanRepository
import com.astrimgym.cliente.data.repository.computeMacros
import com.astrimgym.cliente.data.repository.mealCategoryEmoji
import com.astrimgym.cliente.data.repository.mealCategoryLabel
import com.astrimgym.cliente.data.repository.mealTypeLabel
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AstrimButton
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.AstrimPillButton
import com.astrimgym.cliente.ui.components.AstrimTextField
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

@Composable
fun MealPlanDetailScreen(
    mealPlanRepository: MealPlanRepository,
    mealLogRepository: MealLogRepository,
    mealPlanId: String,
    mealType: String?,
    entryId: String?,
    onDone: () -> Unit,
) {
    val viewModel: MealPlanDetailViewModel = viewModel(
        factory = ViewModelFactory { MealPlanDetailViewModel(mealPlanRepository, mealLogRepository, mealPlanId, mealType, entryId) },
    )
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        when (val current = state) {
            is AddEntryUiState.Loading -> Column(Modifier.fillMaxSize()) {
                ScreenHeader(title = "Agregar alimento", onBack = onDone)
                LoadingState()
            }
            is AddEntryUiState.Error -> Column(Modifier.fillMaxSize()) {
                ScreenHeader(title = "Agregar alimento", onBack = onDone)
                ErrorState(current.message, onRetry = viewModel::refresh)
            }
            is AddEntryUiState.Ready -> {
                val backAction: () -> Unit = {
                    if (current.step == AddEntryStep.CATEGORY) onDone() else viewModel.goBackStep()
                }
                BackHandler(onBack = backAction)
                Column(Modifier.fillMaxSize()) {
                    ScreenHeader(title = mealTypeLabel(current.mealType), onBack = backAction)
                    when (current.step) {
                        AddEntryStep.CATEGORY -> CategoryStep(current, onSelect = viewModel::selectCategory)
                        AddEntryStep.FOOD -> FoodStep(current, onSelect = viewModel::selectFood)
                        AddEntryStep.QUANTITY -> QuantityStep(
                            state = current,
                            onQuantityChange = viewModel::setQuantity,
                            onChangeFood = viewModel::changeFood,
                            onSelectEquivalent = viewModel::selectFood,
                            onSave = { viewModel.save(onDone) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryStep(
    state: AddEntryUiState.Ready,
    onSelect: (String) -> Unit,
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(4.dp))
        Eyebrow("Categoría")
        Spacer(Modifier.height(4.dp))
        Text(
            "¿Qué tipo de alimento vas a registrar?",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(20.dp))
        CategoryChips(
            categories = state.plan.foodsByCategory.keys.toList(),
            onSelect = onSelect,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoryChips(categories: List<String>, onSelect: (String) -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        categories.forEach { category ->
            AstrimPillButton(
                text = "${mealCategoryEmoji(category)} ${mealCategoryLabel(category)}",
                onClick = { onSelect(category) },
            )
        }
    }
}

@Composable
private fun FoodStep(
    state: AddEntryUiState.Ready,
    onSelect: (AllowedFood) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val foods = state.plan.foodsByCategory[state.selectedCategory].orEmpty()
        .filter { it.name.contains(query, ignoreCase = true) }

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(4.dp))
        Eyebrow(state.selectedCategory?.let(::mealCategoryLabel) ?: "Alimento")
        Spacer(Modifier.height(4.dp))
        Text(
            "Elegí el alimento",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(14.dp))
        AstrimTextField(
            value = query,
            onValueChange = { query = it },
            label = "Buscar",
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(10.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = BottomBarSpace),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(foods, key = { it.foodId }) { food ->
                FoodGridCell(food, onClick = { onSelect(food) })
            }
        }
    }
}

@Composable
private fun FoodGridCell(food: AllowedFood, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
    ) {
        FoodImage(
            foodName = food.name,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(16.dp)),
        )
        Spacer(Modifier.height(6.dp))
        Text(
            food.name,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            foodMacroHint(food),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/**
 * Cuando hay porción de referencia (ej. "1 banano mediano" ≈ 120 g), se
 * muestran los macros YA ESCALADOS a esa porción — mostrar el crudo "por
 * 100 g" no le dice nada al cliente sobre cuánto es en la vida real.
 */
private fun foodMacroHint(food: AllowedFood): String {
    val refQty = food.referenceQty
    val refLabel = food.referenceLabel
    if (refQty != null && !refLabel.isNullOrBlank()) {
        val macros = computeMacros(food, refQty)
        val kcal = "${formatNumber(macros.calories)} kcal"
        val prot = "${formatNumber(macros.protein)} g prot"
        return "$refLabel (${formatNumber(refQty)} ${food.defaultUnit}) · $kcal · $prot"
    }
    val per = if (food.defaultUnit == "g" || food.defaultUnit == "ml") "100 ${food.defaultUnit}" else "1 ${food.defaultUnit}"
    val kcal = food.caloriesKcal?.let { "${formatNumber(it)} kcal" }
    val prot = food.proteinG?.let { "${formatNumber(it)} g prot" }
    return listOfNotNull(kcal, prot).joinToString(" · ").ifBlank { "" }.let { if (it.isBlank()) "por $per" else "$it / $per" }
}

@Composable
private fun QuantityStep(
    state: AddEntryUiState.Ready,
    onQuantityChange: (String) -> Unit,
    onChangeFood: () -> Unit,
    onSelectEquivalent: (AllowedFood) -> Unit,
    onSave: () -> Unit,
) {
    val food = state.selectedFood ?: return
    val plan = state.plan
    val preview = state.previewMacros()
    val accent = LocalAstrimAccent.current

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(4.dp))
        FoodImage(
            foodName = food.name,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .clip(RoundedCornerShape(16.dp)),
        )
        Spacer(Modifier.height(12.dp))
        Eyebrow(mealCategoryLabel(food.category))
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                food.name,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f),
            )
            Text(
                "Cambiar",
                style = MaterialTheme.typography.labelLarge,
                color = accent.base,
                modifier = Modifier.clickable(onClick = onChangeFood).padding(6.dp),
            )
        }

        Spacer(Modifier.height(16.dp))
        AstrimTextField(
            value = state.quantityText,
            onValueChange = onQuantityChange,
            label = "Cantidad (${food.defaultUnit})",
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
        )
        if (food.referenceQty != null && !food.referenceLabel.isNullOrBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(
                "Referencia: ${food.referenceLabel} ≈ ${formatNumber(food.referenceQty)} ${food.defaultUnit}. " +
                    "Tocá para usarla.",
                style = MaterialTheme.typography.bodySmall,
                color = accent.base,
                modifier = Modifier.clickable {
                    onQuantityChange(formatNumber(food.referenceQty))
                },
            )
        }

        Spacer(Modifier.height(16.dp))
        AstrimCard(modifier = Modifier.fillMaxWidth()) {
            Eyebrow("Vista previa")
            Spacer(Modifier.height(6.dp))
            Text(
                "${formatNumber(state.previewQuantity())} ${food.defaultUnit} → " +
                    "${formatNumber(preview.calories)} kcal · ${formatNumber(preview.protein)} g proteína · " +
                    "${formatNumber(preview.carbs)} g carbos · ${formatNumber(preview.fat)} g grasa",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }

        val helperLines = remainingNeedLines(state, preview)
        if (helperLines.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Column {
                helperLines.forEach {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 2.dp),
                    )
                }
            }
        }

        val equivalents = plan.foodsByCategory[food.category].orEmpty().filter { it.foodId != food.foodId }
        if (equivalents.isNotEmpty()) {
            Spacer(Modifier.height(18.dp))
            Eyebrow("Equivalentes en ${mealCategoryLabel(food.category).lowercase()}")
            Spacer(Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(equivalents, key = { it.foodId }) { equiv ->
                    AstrimPillButton(text = equiv.name, onClick = { onSelectEquivalent(equiv) })
                }
            }
        }

        state.saveError?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.tertiary)
        }

        Spacer(Modifier.height(24.dp))
        AstrimButton(
            text = if (state.isEditing) "Guardar cambios" else "Guardar",
            onClick = onSave,
            loading = state.saving,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(BottomBarSpace))
    }
}

private fun remainingNeedLines(state: AddEntryUiState.Ready, preview: Macros): List<String> {
    val plan = state.plan
    val already = state.alreadyLoggedToday
    return buildList {
        plan.dailyProteinTarget?.let {
            val remaining = (it - already.protein - preview.protein).coerceAtLeast(0.0)
            add("Te faltan aproximadamente ${formatNumber(remaining)} g de proteína para el objetivo de hoy.")
        }
        plan.dailyCaloriesTarget?.let {
            val remaining = (it - already.calories - preview.calories).coerceAtLeast(0.0)
            add("Te faltan aproximadamente ${formatNumber(remaining)} kcal para el objetivo de hoy.")
        }
        plan.dailyCarbsTarget?.let {
            val remaining = (it - already.carbs - preview.carbs).coerceAtLeast(0.0)
            add("Te faltan aproximadamente ${formatNumber(remaining)} g de carbohidratos para el objetivo de hoy.")
        }
        plan.dailyFatTarget?.let {
            val remaining = (it - already.fat - preview.fat).coerceAtLeast(0.0)
            add("Te faltan aproximadamente ${formatNumber(remaining)} g de grasa para el objetivo de hoy.")
        }
    }
}

private fun formatNumber(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else "%.1f".format(value)
