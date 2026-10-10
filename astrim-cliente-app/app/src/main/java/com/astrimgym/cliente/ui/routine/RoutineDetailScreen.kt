package com.astrimgym.cliente.ui.routine

import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.model.RoutineExerciseDoc
import com.astrimgym.cliente.data.repository.RoutineDetail
import com.astrimgym.cliente.data.repository.RoutineRepository
import com.astrimgym.cliente.data.repository.WorkoutRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AccentEyebrow
import com.astrimgym.cliente.ui.components.AstrimButton
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.ChipTone
import com.astrimgym.cliente.ui.components.EmptyState
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.InfoChip
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.components.pressable
import com.astrimgym.cliente.ui.components.rememberHaptics
import com.astrimgym.cliente.ui.theme.Info
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.Radii
import com.astrimgym.cliente.ui.theme.TextSecondary
import com.astrimgym.cliente.ui.theme.TextTertiary

@Composable
fun RoutineDetailScreen(
    routineRepository: RoutineRepository,
    routineId: String,
    onBack: () -> Unit,
    onOpenExercise: (exerciseId: String) -> Unit,
    onStartWorkout: () -> Unit,
) {
    val viewModel: RoutineDetailViewModel = viewModel(
        factory = ViewModelFactory { RoutineDetailViewModel(routineRepository, routineId) },
    )
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        Column(Modifier.fillMaxSize()) {
            ScreenHeader(title = "Rutina", onBack = onBack)
            when (val current = state) {
                is RoutineDetailUiState.Loading -> LoadingState()
                is RoutineDetailUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
                is RoutineDetailUiState.Success ->
                    if (current.detail.exercises.isEmpty()) {
                        EmptyState(
                            title = "Rutina sin ejercicios",
                            message = "Tu entrenador todavía no cargó ejercicios en esta rutina.",
                            icon = Icons.Outlined.FitnessCenter,
                        )
                    } else {
                        RoutineContent(current.detail, onOpenExercise)
                    }
            }
        }

        val ready = (state as? RoutineDetailUiState.Success)?.detail?.exercises?.isNotEmpty() == true
        if (ready) {
            val bg = MaterialTheme.colorScheme.background
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(bg.copy(alpha = 0f), bg, bg)))
                    .navigationBarsPadding()
                    .padding(start = 20.dp, end = 20.dp, top = 28.dp, bottom = 16.dp),
            ) {
                AstrimButton(
                    text = "Iniciar entrenamiento",
                    onClick = onStartWorkout,
                    modifier = Modifier.fillMaxWidth(),
                    icon = Icons.Rounded.PlayArrow,
                    height = 58.dp,
                )
            }
        }
    }
}

@Composable
private fun RoutineContent(d: RoutineDetail, onOpenExercise: (String) -> Unit) {
    val minutes = remember(d) {
        estimateRoutineMinutes(
            d.exercises,
            defaultRestSeconds = WorkoutRepository.DEFAULT_REST_SECONDS,
            betweenExercisesSeconds = WorkoutRepository.BETWEEN_EXERCISES_SECONDS,
        )
    }
    val sets = remember(d) { totalStrengthSets(d.exercises) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 4.dp, bottom = 130.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item(key = "hero") {
            Column {
                AccentEyebrow("Rutina asignada")
                Spacer(Modifier.height(6.dp))
                Text(
                    d.routine.name ?: "Rutina",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                d.routine.description?.takeIf { it.isNotBlank() }?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    modifier = Modifier.height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    StatBox("Ejercicios", d.exercises.size.toString(), Modifier.weight(1f).fillMaxHeight())
                    if (sets > 0) StatBox("Series", sets.toString(), Modifier.weight(1f).fillMaxHeight())
                    if (minutes != null) StatBox("Duración", "≈ $minutes min", Modifier.weight(1f).fillMaxHeight())
                }
                d.routine.notes?.takeIf { it.isNotBlank() }?.let {
                    Spacer(Modifier.height(12.dp))
                    TrainerNote(it)
                }
                Spacer(Modifier.height(20.dp))
                Eyebrow("Orden de la sesión")
                Spacer(Modifier.height(2.dp))
            }
        }
        itemsIndexed(d.exercises, key = { i, e -> "${e.exerciseId ?: "row"}-$i" }) { i, e ->
            ExerciseRow(index = i + 1, exercise = e) { e.exerciseId?.let(onOpenExercise) }
        }
    }
}

@Composable
private fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    AstrimCard(modifier = modifier, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = TextTertiary)
        Spacer(Modifier.height(4.dp))
        Text(value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
    }
}

@Composable
internal fun TrainerNote(text: String, modifier: Modifier = Modifier) {
    val accent = LocalAstrimAccent.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .clip(Radii.cardSmall)
            .background(MaterialTheme.colorScheme.surface),
    ) {
        Box(Modifier.width(3.dp).fillMaxHeight().background(accent.base))
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            Eyebrow("Nota del entrenador")
            Spacer(Modifier.height(4.dp))
            Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ExerciseRow(index: Int, exercise: RoutineExerciseDoc, onClick: () -> Unit) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val interaction = remember { MutableInteractionSource() }
    val cardio = exercise.isCardio
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(Radii.card)
            .background(MaterialTheme.colorScheme.surface)
            .pressable(interaction = interaction) { haptics.tick(); onClick() }
            .padding(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(Radii.tile)
                .background(if (cardio) Info.copy(alpha = 0.12f) else accent.soft),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "%02d".format(index),
                style = MaterialTheme.typography.titleMedium,
                color = if (cardio) Info else accent.base,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                exercise.exerciseName ?: "Ejercicio",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(2.dp))
            Text(exercise.summaryLine(), style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (cardio) InfoChip("Cardio", tone = ChipTone.INFO, icon = Icons.Outlined.DirectionsRun)
                exercise.weightLine()?.let { InfoChip(it, tone = ChipTone.ACCENT, icon = Icons.Outlined.FitnessCenter) }
                if (!cardio) {
                    InfoChip(
                        "Descanso " + (exercise.restLine() ?: "${WorkoutRepository.DEFAULT_REST_SECONDS} s"),
                        icon = Icons.Outlined.Timer,
                    )
                }
            }
            exercise.notes?.takeIf { it.isNotBlank() }?.let {
                Spacer(Modifier.height(8.dp))
                Text(
                    "“$it”",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                    fontStyle = FontStyle.Italic,
                )
            }
        }
        Icon(
            Icons.AutoMirrored.Rounded.KeyboardArrowRight,
            contentDescription = "Ver ejercicio",
            tint = TextTertiary,
            modifier = Modifier.padding(top = 10.dp),
        )
    }
}
