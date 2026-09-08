package com.astrimgym.cliente.ui.mealplan

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.repository.AssignedMealPlanSummary
import com.astrimgym.cliente.data.repository.MealPlanRepository
import com.astrimgym.cliente.data.repository.mealPlanGoalLabel
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.EmptyState
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

/** Lista de planes de alimentación asignados al cliente — puede tener más de uno a la vez (ej. "Bajar peso" y "Definición"). */
@Composable
fun MealPlanChooserScreen(
    mealPlanRepository: MealPlanRepository,
    onOpenPlan: (mealPlanId: String) -> Unit,
) {
    val viewModel: MealPlanChooserViewModel =
        viewModel(factory = ViewModelFactory { MealPlanChooserViewModel(mealPlanRepository) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(title = "Alimentación")
        when (val current = state) {
            is MealPlanChooserUiState.Loading -> LoadingState()
            is MealPlanChooserUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
            is MealPlanChooserUiState.Success -> {
                if (current.plans.isEmpty()) {
                    EmptyState(
                        title = "Sin plan asignado",
                        message = "No tenés un plan de alimentación asignado todavía.",
                        glyph = "◇",
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(top = 8.dp, bottom = BottomBarSpace),
                    ) {
                        items(current.plans, key = { it.assignmentId }) { plan ->
                            MealPlanCard(plan) { onOpenPlan(plan.mealPlanId) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MealPlanCard(plan: AssignedMealPlanSummary, onClick: () -> Unit) {
    val accent = LocalAstrimAccent.current
    val active = plan.status == "ACTIVE"
    AstrimCard(
        modifier = Modifier.fillMaxWidth(),
        hero = active,
        onClick = onClick,
        contentPadding = PaddingValues(18.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    plan.name,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    mealPlanGoalLabel(plan.goal),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (active) accent.soft else MaterialTheme.colorScheme.surfaceContainerHigh),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                    contentDescription = null,
                    tint = if (active) accent.base else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
