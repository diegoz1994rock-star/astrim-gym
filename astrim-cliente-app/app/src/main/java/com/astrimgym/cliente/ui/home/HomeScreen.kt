package com.astrimgym.cliente.ui.home

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.repository.HomeRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.common.exercisesLabel
import com.astrimgym.cliente.ui.components.AstrimButton
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ProgressRing
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import java.time.LocalDate
import java.time.format.TextStyle as JavaTextStyle
import java.util.Locale

@Composable
fun HomeScreen(
    homeRepository: HomeRepository,
    onAccentColorResolved: (Color) -> Unit,
    onStartWorkout: (routineId: String) -> Unit,
    onOpenRoutines: () -> Unit,
) {
    val viewModel: HomeViewModel = viewModel(factory = ViewModelFactory { HomeViewModel(homeRepository) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    when (val current = state) {
        is HomeUiState.Loading -> LoadingState()
        is HomeUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
        is HomeUiState.Success -> {
            onAccentColorResolved(parseBrandColor(current.data.gym?.brandColor))
            HomeContent(current, onStartWorkout, onOpenRoutines)
        }
    }
}

@Composable
private fun HomeContent(
    state: HomeUiState.Success,
    onStartWorkout: (routineId: String) -> Unit,
    onOpenRoutines: () -> Unit,
) {
    val client = state.data.client
    val gym = state.data.gym
    val routine = state.data.todayRoutine
    val firstName = client.name?.trim()?.substringBefore(" ").orEmpty()
    val today = remember {
        LocalDate.now().dayOfWeek
            .getDisplayName(JavaTextStyle.FULL, Locale("es"))
            .replaceFirstChar { it.uppercase() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(14.dp))

        // --- Cabecera: saludo + logo del gimnasio ---
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    today.uppercase(),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    if (firstName.isNotBlank()) "Hola, $firstName" else "Hola",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                gym?.name?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            GymLogo(gym?.logoBase64)
        }

        Spacer(Modifier.height(18.dp))
        WeekStrip()
        Spacer(Modifier.height(20.dp))

        // --- Tarjeta protagonista: entrenamiento de hoy ---
        if (routine?.routineName != null) {
            TodayWorkoutCard(
                routineName = routine.routineName,
                exerciseCount = (routine.exerciseCount ?: 0L).toInt(),
                onStart = { routine.routineId?.let(onStartWorkout) },
                canStart = routine.routineId != null,
            )
        } else {
            AstrimCard(modifier = Modifier.fillMaxWidth(), hero = true) {
                Eyebrow("Entrenamiento de hoy")
                Spacer(Modifier.height(10.dp))
                Text(
                    "Todavía no tenés una rutina activa",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Tu entrenador te la asigna desde el panel. Cuando esté lista, aparece acá.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(14.dp))

        // --- Acceso rápido a rutinas ---
        AstrimCard(
            modifier = Modifier.fillMaxWidth(),
            onClick = onOpenRoutines,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "Mis rutinas",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        "Rutina actual e historial",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Icon(
                    Icons.AutoMirrored.Rounded.ArrowForward,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        val goal = goalLabel(client.goal)
        val trainer = client.trainerName?.takeIf { it.isNotBlank() }
        if (goal != null || trainer != null) {
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.height(IntrinsicSize.Min),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (goal != null) MiniTile("Objetivo", goal, Modifier.weight(1f).fillMaxHeight())
                if (trainer != null) MiniTile("Entrenador", trainer, Modifier.weight(1f).fillMaxHeight())
            }
        }

        Spacer(Modifier.height(12.dp))
        AstrimCard(modifier = Modifier.fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp)) {
            Eyebrow("Mensaje del día")
            Spacer(Modifier.height(8.dp))
            Text(
                messageOfTheDay(),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Spacer(Modifier.height(BottomBarSpace))
    }
}

@Composable
private fun MiniTile(label: String, value: String, modifier: Modifier = Modifier) {
    AstrimCard(modifier = modifier, contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            value,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 2,
        )
    }
}

private fun goalLabel(raw: String?): String? = when (raw?.uppercase()) {
    null, "" -> null
    "FAT_LOSS" -> "Pérdida de grasa"
    "MUSCLE_GAIN" -> "Ganancia muscular"
    "STRENGTH" -> "Fuerza"
    "ENDURANCE" -> "Resistencia"
    "MAINTENANCE" -> "Mantenimiento"
    "OTHER" -> "Otro"
    else -> raw
}

@Composable
private fun TodayWorkoutCard(
    routineName: String,
    exerciseCount: Int,
    onStart: () -> Unit,
    canStart: Boolean,
) {
    val accent = LocalAstrimAccent.current
    AstrimCard(modifier = Modifier.fillMaxWidth(), hero = true) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Eyebrow("Entrenamiento de hoy")
                Spacer(Modifier.height(10.dp))
                Text(
                    routineName,
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    exercisesLabel(exerciseCount),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            ProgressRing(
                progress = 0f,
                diameter = 84.dp,
                stroke = 6.dp,
                animate = false,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        exerciseCount.toString(),
                        style = MaterialTheme.typography.headlineSmall,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "ejerc.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        AstrimButton(
            text = "Iniciar entrenamiento",
            onClick = onStart,
            enabled = canStart,
            modifier = Modifier.fillMaxWidth(),
            icon = {
                Icon(Icons.Rounded.PlayArrow, contentDescription = null, tint = accent.onAccent)
            },
        )
    }
}

@Composable
private fun GymLogo(base64: String?) {
    val bitmap = remember(base64) {
        if (base64.isNullOrBlank()) null
        else runCatching {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        }.getOrNull()
    } ?: return
    Image(
        bitmap = bitmap.asImageBitmap(),
        contentDescription = "Logo del gimnasio",
        contentScale = ContentScale.Fit,
        modifier = Modifier
            .size(48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerHigh),
    )
}

@Composable
private fun WeekStrip(modifier: Modifier = Modifier) {
    val accent = LocalAstrimAccent.current
    val labels = listOf("L", "M", "M", "J", "V", "S", "D")
    val todayIdx = (java.time.LocalDate.now().dayOfWeek.value - 1).coerceIn(0, 6)
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        labels.forEachIndexed { i, d ->
            val isToday = i == todayIdx
            Box(
                modifier = Modifier
                    .size(width = 40.dp, height = 44.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (isToday) accent.base else MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    d,
                    style = MaterialTheme.typography.titleSmall,
                    color = if (isToday) accent.onAccent else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = if (isToday) FontWeight.Bold else FontWeight.Medium,
                )
            }
        }
    }
}
