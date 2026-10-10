package com.astrimgym.cliente.ui.routine

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.model.ExerciseDoc
import com.astrimgym.cliente.data.model.muscleGroupLabel
import com.astrimgym.cliente.data.model.RoutineExerciseDoc
import com.astrimgym.cliente.data.repository.RoutineRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AccentEyebrow
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.ChipTone
import com.astrimgym.cliente.ui.exercise.ExerciseMedia
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.InfoChip
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader

@Composable
fun ExerciseDetailScreen(
    routineRepository: RoutineRepository,
    routineId: String,
    exerciseId: String,
    onBack: () -> Unit,
) {
    val viewModel: ExerciseDetailViewModel = viewModel(
        factory = ViewModelFactory { ExerciseDetailViewModel(routineRepository, routineId, exerciseId) },
    )
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(title = "Ejercicio", onBack = onBack)
        when (val current = state) {
            is ExerciseDetailUiState.Loading -> LoadingState()
            is ExerciseDetailUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
            is ExerciseDetailUiState.Success -> Content(
                exerciseId = exerciseId,
                exercise = current.data.exercise,
                config = current.data.routineConfig,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Content(exerciseId: String, exercise: ExerciseDoc, config: RoutineExerciseDoc?) {
    val hasVideo = parseVideo(exercise.videoPath).kind != VideoKind.NONE
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(4.dp))
        Text(
            exercise.name ?: config?.exerciseName ?: "Ejercicio",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(10.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            muscleGroupLabel(exercise.muscleGroup)?.let { InfoChip(it, tone = ChipTone.ACCENT) }
            exercise.equipment?.takeIf { it.isNotBlank() }?.let { InfoChip(it) }
            exercise.level?.takeIf { it.isNotBlank() }?.let { InfoChip(levelLabel(it)) }
        }

        // Demostración local (animación/ilustración) o respaldo neutro. Si
        // el gimnasio cargó un video, se muestra debajo con su reproductor.
        Spacer(Modifier.height(16.dp))
        ExerciseMedia(
            exerciseId = exerciseId,
            name = exercise.name,
            muscleGroup = muscleGroupLabel(exercise.muscleGroup),
            isCardio = config?.isCardio == true,
            active = false,
            modifier = Modifier.fillMaxWidth().aspectRatio(16f / 11f),
        )

        if (config != null) {
            Spacer(Modifier.height(16.dp))
            AstrimCard(modifier = Modifier.fillMaxWidth()) {
                AccentEyebrow("Lo que te prescribió tu entrenador")
                Spacer(Modifier.height(10.dp))
                Text(
                    config.summaryLine(),
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                val extras = listOfNotNull(
                    config.weightLine()?.let { "Peso $it" },
                    config.restLine()?.let { "Descanso $it" },
                )
                if (extras.isNotEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        extras.joinToString("   ·   "),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            config.notes?.takeIf { it.isNotBlank() }?.let {
                Spacer(Modifier.height(10.dp))
                TrainerNote(it)
            }
        }

        if (hasVideo) {
            Section("Video de demostración")
            VideoSection(exercise.videoPath)
        }

        exercise.description?.takeIf { it.isNotBlank() }?.let {
            Section("Descripción")
            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        exercise.instructions?.takeIf { it.isNotBlank() }?.let {
            Section("Instrucciones")
            Paragraphs(it)
        }
        exercise.commonMistakes?.takeIf { it.isNotBlank() }?.let {
            Section("Errores comunes")
            Paragraphs(it, bullet = true)
        }

        Spacer(Modifier.height(40.dp))
    }
}

@Composable
private fun Section(title: String) {
    Spacer(Modifier.height(22.dp))
    Eyebrow(title)
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun Paragraphs(text: String, bullet: Boolean = false) {
    val lines = text.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        lines.forEachIndexed { i, line ->
            Row {
                Text(
                    if (bullet) "•  " else "${i + 1}.  ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    line,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun levelLabel(raw: String): String = when (raw.uppercase()) {
    "BEGINNER" -> "Principiante"
    "INTERMEDIATE" -> "Intermedio"
    "ADVANCED" -> "Avanzado"
    else -> raw
}
