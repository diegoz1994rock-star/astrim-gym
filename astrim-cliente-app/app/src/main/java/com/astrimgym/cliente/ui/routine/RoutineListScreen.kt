package com.astrimgym.cliente.ui.routine

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.History
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.repository.AssignedRoutine
import com.astrimgym.cliente.data.repository.RoutineRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.common.exercisesLabel
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.ChipTone
import com.astrimgym.cliente.ui.components.EmptyState
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.IconTile
import com.astrimgym.cliente.ui.components.InfoChip
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.TextSecondary
import com.astrimgym.cliente.ui.theme.TextTertiary
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

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
        ScreenHeader(title = "Rutinas", subtitle = "Asignadas por tu entrenador")
        when (val current = state) {
            is RoutineListUiState.Loading -> LoadingState()
            is RoutineListUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
            is RoutineListUiState.Success -> {
                if (current.current.isEmpty() && current.history.isEmpty()) {
                    EmptyState(
                        title = "Sin rutinas todavía",
                        message = "Tu entrenador todavía no te asignó ninguna rutina. Cuando lo haga, la vas a ver acá.",
                        icon = Icons.Outlined.FitnessCenter,
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(top = 4.dp, bottom = BottomBarSpace),
                    ) {
                        if (current.current.isNotEmpty()) {
                            item(key = "h-current") { Eyebrow("Rutina actual") }
                            items(current.current, key = { it.assignmentId }) {
                                RoutineCard(it, primary = true) { onOpenRoutine(it.routineId) }
                            }
                        }
                        if (current.history.isNotEmpty()) {
                            item(key = "h-history") {
                                Spacer(Modifier.height(12.dp))
                                Eyebrow("Historial")
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
    AstrimCard(
        modifier = Modifier.fillMaxWidth(),
        hero = primary,
        onClick = onClick,
        contentPadding = PaddingValues(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconTile(
                if (primary) Icons.Outlined.FitnessCenter else Icons.Outlined.History,
                tint = if (primary) com.astrimgym.cliente.ui.theme.Lime else TextSecondary,
                size = 48.dp,
            )
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    routine.name,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    listOfNotNull(exercisesLabel(routine.exerciseCount), dateRange(routine.startDate, routine.endDate))
                        .joinToString("  ·  "),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
                Spacer(Modifier.height(8.dp))
                val (label, tone) = statusLabel(routine.status)
                InfoChip(label, tone = tone)
            }
            Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = TextTertiary)
        }
    }
}

private fun statusLabel(status: String): Pair<String, ChipTone> = when (status.uppercase()) {
    "ACTIVE" -> "Activa" to ChipTone.ACCENT
    "COMPLETED", "FINISHED" -> "Finalizada" to ChipTone.SUCCESS
    "PAUSED" -> "En pausa" to ChipTone.WARNING
    "ARCHIVED", "INACTIVE" -> "Archivada" to ChipTone.NEUTRAL
    else -> status.lowercase().replaceFirstChar { it.uppercase() } to ChipTone.NEUTRAL
}

private val SHORT = DateTimeFormatter.ofPattern("d MMM", Locale("es"))

private fun dateRange(start: String?, end: String?): String? {
    fun fmt(raw: String?) = raw?.take(10)?.let { runCatching { LocalDate.parse(it).format(SHORT) }.getOrNull() }
    val a = fmt(start)
    val b = fmt(end)
    return when {
        a != null && b != null -> "$a – $b"
        a != null -> "desde $a"
        else -> null
    }
}
