package com.astrimgym.cliente.ui.mealplan

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.repository.ActiveMealPlan
import com.astrimgym.cliente.data.repository.MEAL_TYPE_ORDER
import com.astrimgym.cliente.data.repository.Macros
import com.astrimgym.cliente.data.repository.MealLogEntry
import com.astrimgym.cliente.data.repository.MealLogRepository
import com.astrimgym.cliente.data.repository.MealPlanRepository
import com.astrimgym.cliente.data.repository.mealCategoryLabel
import com.astrimgym.cliente.data.repository.mealPlanGoalLabel
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.AstrimOutlineButton
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.MacroProgressBar
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

/** Categorías que ya se ven reflejadas en los macros diarios (Proteína/Carbohidratos/Grasa)
 *  — se excluyen de las metas por categoría para no mostrar el mismo dato dos veces. */
private val CATEGORIES_COVERED_BY_MACROS = setOf("PROTEINA", "CARBOHIDRATO", "GRASA")

@Composable
fun MealPlanListScreen(
    mealPlanRepository: MealPlanRepository,
    mealLogRepository: MealLogRepository,
    mealPlanId: String,
    onBack: () -> Unit,
    onAddFood: (mealType: String) -> Unit,
    onEditEntry: (entryId: String) -> Unit,
) {
    val viewModel: MealPlanListViewModel =
        viewModel(factory = ViewModelFactory { MealPlanListViewModel(mealPlanRepository, mealLogRepository, mealPlanId) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    // Vuelve a cargar al retomar la pantalla (p. ej. al volver del flujo de
    // agregar/editar alimento), sin depender de un resultado de navegación.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var pendingDeleteId by remember { mutableStateOf<String?>(null) }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(
            title = (state as? MealPlanSummaryUiState.Success)?.plan?.name ?: "Alimentación",
            onBack = onBack,
        )
        when (val current = state) {
            is MealPlanSummaryUiState.Loading -> LoadingState()
            is MealPlanSummaryUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
            is MealPlanSummaryUiState.Success -> MealPlanSummaryContent(
                state = current,
                onAddFood = onAddFood,
                onEditEntry = onEditEntry,
                onDeleteRequest = { pendingDeleteId = it },
            )
        }
    }

    pendingDeleteId?.let { entryId ->
        AlertDialog(
            onDismissRequest = { pendingDeleteId = null },
            title = { Text("Eliminar alimento") },
            text = { Text("¿Querés quitar este alimento de tu registro de hoy?") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteEntry(entryId)
                    pendingDeleteId = null
                }) { Text("Eliminar") }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteId = null }) { Text("Cancelar") }
            },
        )
    }
}

@Composable
private fun MealPlanSummaryContent(
    state: MealPlanSummaryUiState.Success,
    onAddFood: (String) -> Unit,
    onEditEntry: (String) -> Unit,
    onDeleteRequest: (String) -> Unit,
) {
    val plan = state.plan
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = BottomBarSpace),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { GoalCard(plan) }

        val dailyTargets = buildList {
            plan.dailyCaloriesTarget?.let { add(Triple("Calorías", it, "kcal")) }
            plan.dailyProteinTarget?.let { add(Triple("Proteína", it, "g")) }
            plan.dailyCarbsTarget?.let { add(Triple("Carbohidratos", it, "g")) }
            plan.dailyFatTarget?.let { add(Triple("Grasa", it, "g")) }
        }
        if (dailyTargets.isNotEmpty()) {
            item { DailyTargetsCard(dailyTargets) }
        }

        // Categorías con meta propia que NO se solapan con un macro (Verdura, Fruta, etc.):
        // esas sí aportan información nueva por comida y en el total.
        val extraCategoryTargets = plan.categoryTargets.filter { it.category !in CATEGORIES_COVERED_BY_MACROS }

        // ---- Desglose por comida: totales de cada comida del día, sin mezclarlos entre sí ----
        val mealsWithEntries = MEAL_TYPE_ORDER.filter { (key, _) -> !state.entriesByMealType[key].isNullOrEmpty() }
        if (mealsWithEntries.isNotEmpty()) {
            item {
                Spacer(Modifier.height(4.dp))
                Eyebrow("Totales por comida")
            }
            mealsWithEntries.forEach { (key, label) ->
                item {
                    val entries = state.entriesByMealType[key].orEmpty()
                    val macros = Macros(
                        calories = entries.sumOf { it.calories },
                        protein = entries.sumOf { it.protein },
                        carbs = entries.sumOf { it.carbs },
                        fat = entries.sumOf { it.fat },
                    )
                    val categoryTotals = extraCategoryTargets.mapNotNull { ct ->
                        val qty = entries.filter { it.category == ct.category }.sumOf { it.quantity }
                        if (qty > 0) mealCategoryLabel(ct.category) to (qty to ct.targetUnit) else null
                    }
                    MealSummaryCard(label = label, macros = macros, categoryTotals = categoryTotals)
                }
            }
        }

        // ---- Meta diaria: la suma de TODAS las comidas contra el objetivo del día ----
        val progressRows = buildList {
            plan.dailyCaloriesTarget?.let { add(MacroProgressRowData("Calorías", state.todayTotals.calories, it, "kcal")) }
            plan.dailyProteinTarget?.let { add(MacroProgressRowData("Proteína", state.todayTotals.protein, it, "g")) }
            plan.dailyCarbsTarget?.let { add(MacroProgressRowData("Carbohidratos", state.todayTotals.carbs, it, "g")) }
            plan.dailyFatTarget?.let { add(MacroProgressRowData("Grasa", state.todayTotals.fat, it, "g")) }
            extraCategoryTargets.forEach { ct ->
                add(
                    MacroProgressRowData(
                        label = mealCategoryLabel(ct.category),
                        current = state.categoryLoggedToday[ct.category] ?: 0.0,
                        target = ct.targetQuantity,
                        unit = ct.targetUnit,
                    ),
                )
            }
        }
        if (progressRows.isNotEmpty()) {
            item { TodayProgressCard(progressRows) }
        }

        item {
            Spacer(Modifier.height(4.dp))
            Eyebrow("Comidas de hoy")
        }

        val visibleMealTypes = MEAL_TYPE_ORDER.filter { (key, _) ->
            key in ALWAYS_VISIBLE_MEAL_TYPES || !state.entriesByMealType[key].isNullOrEmpty()
        }
        visibleMealTypes.forEach { (key, label) ->
            item {
                MealTypeSection(
                    label = label,
                    entries = state.entriesByMealType[key].orEmpty(),
                    onAdd = { onAddFood(key) },
                    onEdit = onEditEntry,
                    onDeleteRequest = onDeleteRequest,
                )
            }
        }

        item {
            Spacer(Modifier.height(6.dp))
            NutritionDisclaimer()
        }
    }
}

@Composable
private fun NutritionDisclaimer() {
    Text(
        "Los valores nutricionales mostrados en ASTRIM GYM son valores de referencia obtenidos a partir de " +
            "bases de datos y tablas de composición de alimentos reconocidas, incluyendo USDA FoodData Central, " +
            "así como información nutricional disponible para diferentes alimentos.\n\n" +
            "Los valores se expresan generalmente por 100 g de alimento, salvo aquellos alimentos que se " +
            "muestran por unidad o porción.\n\n" +
            "Ten en cuenta que la composición nutricional puede variar dependiendo de factores como la marca, " +
            "variedad, origen, estado del alimento (crudo o cocido), método de preparación y contenido de agua.\n\n" +
            "En alimentos procesados o empacados, como jamón, atún, quesos, embutidos y otros productos, los " +
            "valores pueden presentar diferencias importantes entre marcas. Cuando sea necesario, se recomienda " +
            "consultar la información nutricional indicada en el envase del producto.\n\n" +
            "Estos datos tienen carácter informativo y de referencia y no sustituyen la valoración ni las " +
            "recomendaciones de un profesional de nutrición.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun GoalCard(plan: ActiveMealPlan) {
    AstrimCard(modifier = Modifier.fillMaxWidth(), hero = true) {
        Eyebrow("Objetivo")
        Spacer(Modifier.height(8.dp))
        Text(
            mealPlanGoalLabel(plan.goal),
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            plan.name,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        plan.notes?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(10.dp))
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun DailyTargetsCard(targets: List<Triple<String, Double, String>>) {
    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Meta diaria")
        Spacer(Modifier.height(10.dp))
        targets.forEach { (label, value, unit) ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "${formatNumber(value)} $unit",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun MealSummaryCard(label: String, macros: Macros, categoryTotals: List<Pair<String, Pair<Double, String>>>) {
    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow(label)
        Spacer(Modifier.height(10.dp))
        SummaryRow("Calorías", "${formatNumber(macros.calories)} kcal")
        SummaryRow("Proteína", "${formatNumber(macros.protein)} g")
        SummaryRow("Carbohidratos", "${formatNumber(macros.carbs)} g")
        SummaryRow("Grasa", "${formatNumber(macros.fat)} g")
        categoryTotals.forEach { (catLabel, qtyAndUnit) ->
            val (qty, unit) = qtyAndUnit
            SummaryRow(catLabel, "${formatNumber(qty)} $unit")
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private data class MacroProgressRowData(val label: String, val current: Double, val target: Double, val unit: String)

@Composable
private fun TodayProgressCard(rows: List<MacroProgressRowData>) {
    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Meta diaria (suma de todas las comidas)")
        Spacer(Modifier.height(14.dp))
        rows.forEachIndexed { index, row ->
            val progress = if (row.target > 0) (row.current / row.target).toFloat() else 0f
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(row.label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "${formatNumber(row.current)} / ${formatNumber(row.target)} ${row.unit}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = LocalAstrimAccent.current.base,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Spacer(Modifier.height(6.dp))
            MacroProgressBar(progress = progress)
            if (index != rows.lastIndex) Spacer(Modifier.height(14.dp))
        }
    }
}

@Composable
private fun MealTypeSection(
    label: String,
    entries: List<MealLogEntry>,
    onAdd: () -> Unit,
    onEdit: (String) -> Unit,
    onDeleteRequest: (String) -> Unit,
) {
    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow(label)
        if (entries.isEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Todavía no registraste nada acá.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Spacer(Modifier.height(6.dp))
            entries.forEach { entry ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { onEdit(entry.id) }
                        .padding(vertical = 10.dp, horizontal = 4.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        FoodImage(
                            foodName = entry.foodName,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape),
                        )
                        Spacer(Modifier.size(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                entry.foodName,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                "${formatNumber(entry.quantity)} ${entry.unit}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        IconButton(onClick = { onDeleteRequest(entry.id) }) {
                            Icon(
                                Icons.Rounded.DeleteOutline,
                                contentDescription = "Eliminar ${entry.foodName}",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Column(modifier = Modifier.fillMaxWidth().padding(start = 52.dp)) {
                        macroDetailRows(entry).forEach { (nutrientLabel, value) ->
                            SummaryRow(nutrientLabel, value)
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        AstrimOutlineButton(
            text = "+ Agregar alimento",
            onClick = onAdd,
            modifier = Modifier.fillMaxWidth(),
            height = 44.dp,
        )
    }
}

private fun macroDetailRows(entry: MealLogEntry): List<Pair<String, String>> = buildList {
    add("Calorías" to "${formatNumber(entry.calories)} kcal")
    if (entry.protein > 0) add("Proteína" to "${formatNumber(entry.protein)} g")
    if (entry.carbs > 0) add("Carbohidratos" to "${formatNumber(entry.carbs)} g")
    if (entry.fat > 0) add("Grasa" to "${formatNumber(entry.fat)} g")
}

private fun formatNumber(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else "%.1f".format(value)
