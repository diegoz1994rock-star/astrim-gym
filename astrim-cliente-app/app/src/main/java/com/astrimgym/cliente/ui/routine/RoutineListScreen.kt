package com.astrimgym.cliente.ui.routine

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
import com.astrimgym.cliente.data.repository.AssignedRoutine
import com.astrimgym.cliente.data.repository.RoutineRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.common.exercisesLabel
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.EmptyState
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

@Composable
fun RoutineListScreen(
    routineRepository: RoutineRepository,
    onOpenRoutine: (routineId: String) -> Unit,
) {
    val viewModel: RoutineListViewModel =
        viewModel(factory = ViewModelFactory { RoutineListViewModel(routineRepository) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(title = "Rutinas")
        when (val current = state) {
            is RoutineListUiState.Loading -> LoadingState()
            is RoutineListUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
            is RoutineListUiState.Success -> {
                if (current.current.isEmpty() && current.history.isEmpty()) {
                    EmptyState(
                        title = "Sin rutinas todavía",
                        message = "Tu entrenador todavía no te asignó ninguna rutina.",
                        glyph = "◇",
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(top = 8.dp, bottom = BottomBarSpace),
                    ) {
                        if (current.current.isNotEmpty()) {
                            item { Eyebrow("Actual") }
                            items(current.current, key = { it.assignmentId }) {
                                RoutineCard(it, primary = true) { onOpenRoutine(it.routineId) }
                            }
                        }
                        if (current.history.isNotEmpty()) {
                            item {
                                Spacer(Modifier.height(12.dp))
                                Eyebrow("Historial", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            items(current.history, key = { it.assignmentId }) {
                                RoutineCard(it, primary = false) { onOpenRoutine(it.routineId) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RoutineCard(routine: AssignedRoutine, primary: Boolean, onClick: () -> Unit) {
    val accent = LocalAstrimAccent.current
    AstrimCard(
        modifier = Modifier.fillMaxWidth(),
        hero = primary,
        onClick = onClick,
        contentPadding = PaddingValues(18.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                if (primary) {
                    Eyebrow("Rutina actual")
                    Spacer(Modifier.height(6.dp))
                }
                Text(
                    routine.name,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    exercisesLabel(routine.exerciseCount),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (primary) accent.soft else MaterialTheme.colorScheme.surfaceContainerHigh),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                    contentDescription = null,
                    tint = if (primary) accent.base else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
