package com.astrimgym.cliente.ui.routine

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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.astrimgym.cliente.data.model.RoutineExerciseDoc
import com.astrimgym.cliente.data.repository.RoutineRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.common.exercisesLabel
import com.astrimgym.cliente.ui.components.AstrimButton
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

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
    val title = (state as? RoutineDetailUiState.Success)?.detail?.routine?.name ?: "Rutina"

    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        Column(Modifier.fillMaxSize()) {
            ScreenHeader(title = title, onBack = onBack)
            when (val current = state) {
                is RoutineDetailUiState.Loading -> LoadingState()
                is RoutineDetailUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
                is RoutineDetailUiState.Success -> {
                    val d = current.detail
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
                        contentPadding = PaddingValues(top = 4.dp, bottom = 120.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        item {
                            AstrimCard(modifier = Modifier.fillMaxWidth(), hero = true) {
                                Eyebrow("Rutina")
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    d.routine.name ?: "Rutina",
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = MaterialTheme.colorScheme.onBackground,
                                )
                                d.routine.description?.takeIf { it.isNotBlank() }?.let {
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        it,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Spacer(Modifier.height(10.dp))
                                Text(
                                    exercisesLabel(d.exercises.size).uppercase(),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = LocalAstrimAccent.current.base,
                                )
                            }
                            Spacer(Modifier.height(16.dp))
                        }
                        itemsIndexed(
                            d.exercises,
                            key = { i, e -> e.exerciseId ?: "row-$i" },
                        ) { i, e ->
                            ExerciseRow(index = i + 1, exercise = e) {
                                e.exerciseId?.let(onOpenExercise)
                            }
                        }
                    }
                }
            }
        }

        val ready = (state as? RoutineDetailUiState.Success)?.detail?.exercises?.isNotEmpty() == true
        if (ready) {
            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background)
                    .navigationBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
            ) {
                AstrimButton(
                    text = "Iniciar entrenamiento",
                    onClick = onStartWorkout,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun ExerciseRow(index: Int, exercise: RoutineExerciseDoc, onClick: () -> Unit) {
    val accent = LocalAstrimAccent.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(accent.soft),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "%02d".format(index),
                style = MaterialTheme.typography.titleSmall,
                color = accent.base,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.size(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                exercise.exerciseName ?: "Ejercicio",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                buildString {
                    append(exercise.summaryLine())
                    exercise.weightLine()?.let { append("  ·  "); append(it) }
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Icon(
            Icons.AutoMirrored.Rounded.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
