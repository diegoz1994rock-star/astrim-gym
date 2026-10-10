package com.astrimgym.cliente.ui.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.FormatQuote
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.LocalProfilePhoto
import com.astrimgym.cliente.data.repository.HomeData
import com.astrimgym.cliente.data.repository.HomeRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.common.exercisesLabel
import com.astrimgym.cliente.ui.components.AccentEyebrow
import com.astrimgym.cliente.ui.components.AstrimButton
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.ChipTone
import com.astrimgym.cliente.ui.components.EmptyState
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.IconTile
import com.astrimgym.cliente.ui.components.InfoChip
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.pressable
import com.astrimgym.cliente.ui.components.rememberHaptics
import com.astrimgym.cliente.ui.theme.Info
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.Positive
import com.astrimgym.cliente.ui.theme.Radii
import com.astrimgym.cliente.ui.theme.TextSecondary
import com.astrimgym.cliente.ui.theme.TextTertiary
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale

private val ES = Locale("es")

@Composable
fun HomeScreen(
    homeRepository: HomeRepository,
    onStartWorkout: (routineId: String) -> Unit,
    onOpenRoutines: () -> Unit,
    onOpenClasses: () -> Unit,
    onOpenProgress: () -> Unit,
    onOpenMealPlan: () -> Unit,
    onOpenProfile: () -> Unit,
) {
    val viewModel: HomeViewModel = viewModel(factory = ViewModelFactory { HomeViewModel(homeRepository) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    when (val current = state) {
        is HomeUiState.Loading -> LoadingState()
        is HomeUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
        is HomeUiState.Success -> HomeContent(
            data = current.data,
            onStartWorkout = onStartWorkout,
            onOpenRoutines = onOpenRoutines,
            onOpenClasses = onOpenClasses,
            onOpenProgress = onOpenProgress,
            onOpenMealPlan = onOpenMealPlan,
            onOpenProfile = onOpenProfile,
        )
    }
}

@Composable
private fun HomeContent(
    data: HomeData,
    onStartWorkout: (routineId: String) -> Unit,
    onOpenRoutines: () -> Unit,
    onOpenClasses: () -> Unit,
    onOpenProgress: () -> Unit,
    onOpenMealPlan: () -> Unit,
    onOpenProfile: () -> Unit,
) {
    val client = data.client
    val routine = data.todayRoutine

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(16.dp))
        Header(
            firstName = client.name?.trim()?.substringBefore(" ").orEmpty(),
            fullName = client.name,
            gymName = data.gym?.name,
            onOpenProfile = onOpenProfile,
        )

        Spacer(Modifier.height(20.dp))
        WeekStrip(trainedDays = data.weekSessions.orEmpty().map { it.date }.toSet())
        Spacer(Modifier.height(20.dp))

        // --- Protagonista: entrenamiento de hoy ---
        if (routine?.routineName != null && routine.routineId != null) {
            TodayWorkoutCard(
                routineName = routine.routineName,
                exerciseCount = (routine.exerciseCount ?: 0L).toInt(),
                goal = goalLabel(client.goal),
                doneToday = data.routineDoneToday,
                onStart = { onStartWorkout(routine.routineId) },
                onOpenRoutine = onOpenRoutines,
            )
        } else {
            AstrimCard(modifier = Modifier.fillMaxWidth(), hero = true, contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)) {
                EmptyState(
                    title = "Tu entrenamiento aún no está listo",
                    message = "Tu entrenador todavía no te asignó una rutina. Cuando lo haga, va a aparecer acá.",
                    icon = Icons.Outlined.FitnessCenter,
                    modifier = Modifier.height(280.dp),
                )
            }
        }

        // --- Complementarias: 3–4 accesos útiles, sin repetir información ---
        Spacer(Modifier.height(24.dp))
        Eyebrow("Tu semana")
        Spacer(Modifier.height(12.dp))
        val week = data.weekSessions
        Row(
            modifier = Modifier.height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            QuickTile(
                icon = Icons.Outlined.Insights,
                label = "Progreso",
                value = when {
                    week == null -> "Ver historial"
                    week.isEmpty() -> "Sin entrenos aún"
                    week.size == 1 -> "1 entreno"
                    else -> "${week.size} entrenos"
                },
                caption = week?.sumOf { it.totalVolume }?.takeIf { it > 0 }?.let { "${it.toInt()} kg levantados" }
                    ?: "esta semana",
                onClick = onOpenProgress,
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
            QuickTile(
                icon = Icons.Outlined.Restaurant,
                label = "Alimentación",
                value = data.activeMealPlan ?: "Sin plan",
                caption = if (data.activeMealPlan != null) "plan activo" else "tu entrenador lo asigna",
                onClick = onOpenMealPlan,
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
        }

        Spacer(Modifier.height(12.dp))
        NextClassCard(data, onOpenClasses)

        val trainer = client.trainerName?.takeIf { it.isNotBlank() }
        if (trainer != null) {
            Spacer(Modifier.height(12.dp))
            AstrimCard(modifier = Modifier.fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(name = trainer, photo = null, size = 40)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Eyebrow("Tu entrenador")
                        Text(trainer, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
        DailyMessageCard()
        Spacer(Modifier.height(BottomBarSpace))
    }
}

@Composable
private fun Header(firstName: String, fullName: String?, gymName: String?, onOpenProfile: () -> Unit) {
    val context = LocalContext.current
    val ownerId = Firebase.auth.currentUser?.uid.orEmpty()
    val photo = remember(ownerId) { LocalProfilePhoto.load(context, ownerId)?.asImageBitmap() }
    val date = remember {
        LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", ES)).replaceFirstChar { it.uppercase() }
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(
                listOfNotNull(date, gymName).joinToString("  ·  "),
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                greeting() + if (firstName.isNotBlank()) "," else "",
                style = MaterialTheme.typography.titleLarge,
                color = TextSecondary,
                fontWeight = FontWeight.Medium,
            )
            if (firstName.isNotBlank()) {
                Text(
                    firstName,
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        val haptics = rememberHaptics()
        val interaction = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
        Box(
            Modifier
                .clip(CircleShape)
                .pressable(interaction = interaction) { haptics.tick(); onOpenProfile() },
        ) {
            Avatar(name = fullName, photo = photo, size = 52)
        }
    }
}

private fun greeting(now: LocalTime = LocalTime.now()): String = when (now.hour) {
    in 5..11 -> "Buenos días"
    in 12..19 -> "Buenas tardes"
    else -> "Buenas noches"
}

@Composable
private fun Avatar(name: String?, photo: androidx.compose.ui.graphics.ImageBitmap?, size: Int) {
    val accent = LocalAstrimAccent.current
    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (photo != null) {
            Image(photo, "Foto de perfil", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else {
            Text(
                initials(name),
                style = if (size >= 48) MaterialTheme.typography.titleLarge else MaterialTheme.typography.titleSmall,
                color = accent.base,
            )
        }
    }
}

private fun initials(name: String?): String {
    val parts = name?.trim()?.split(Regex("\\s+"))?.filter { it.isNotEmpty() }.orEmpty()
    return parts.take(2).joinToString("") { it.first().uppercase() }.ifBlank { "?" }
}

@Composable
private fun TodayWorkoutCard(
    routineName: String,
    exerciseCount: Int,
    goal: String?,
    doneToday: Boolean,
    onStart: () -> Unit,
    onOpenRoutine: () -> Unit,
) {
    val accent = LocalAstrimAccent.current
    AstrimCard(
        modifier = Modifier.fillMaxWidth(),
        hero = true,
        contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
    ) {
        Box {
            // Elemento gráfico: mancuerna grande y tenue, recortada en la esquina.
            Icon(
                Icons.Rounded.FitnessCenter,
                contentDescription = null,
                tint = accent.base.copy(alpha = 0.05f),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 28.dp, y = (-6).dp)
                    .size(150.dp),
            )
            Column(Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AccentEyebrow("Entrenamiento de hoy", Modifier.weight(1f))
                    if (doneToday) {
                        InfoChip("Completado hoy", tone = ChipTone.SUCCESS, icon = Icons.Rounded.CheckCircle)
                    } else {
                        InfoChip("Pendiente")
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    routineName,
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    MetaItem(Icons.Outlined.FitnessCenter, exercisesLabel(exerciseCount))
                    goal?.let { MetaItem(Icons.Outlined.Flag, it) }
                }
                Spacer(Modifier.height(22.dp))
                AstrimButton(
                    text = if (doneToday) "Entrenar de nuevo" else "Iniciar entrenamiento",
                    onClick = onStart,
                    modifier = Modifier.fillMaxWidth(),
                    icon = if (doneToday) Icons.Rounded.Replay else Icons.Rounded.PlayArrow,
                    height = 58.dp,
                )
                Spacer(Modifier.height(4.dp))
                val haptics = rememberHaptics()
                val interaction = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(Radii.button)
                        .pressable(interaction = interaction) { haptics.tick(); onOpenRoutine() }
                        .padding(vertical = 12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Revisar la rutina", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun MetaItem(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
    }
}

@Composable
private fun QuickTile(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    caption: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AstrimCard(modifier = modifier, onClick = onClick, contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
        IconTile(icon, size = 40.dp)
        Spacer(Modifier.height(14.dp))
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = TextTertiary)
        Spacer(Modifier.height(4.dp))
        Text(
            value,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(caption, style = MaterialTheme.typography.bodySmall, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun NextClassCard(data: HomeData, onOpenClasses: () -> Unit) {
    val next = data.nextClass
    AstrimCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onOpenClasses,
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconTile(Icons.Outlined.CalendarMonth, tint = Info)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Eyebrow(if (next != null) "Próxima clase" else "Clases")
                Spacer(Modifier.height(2.dp))
                if (next != null) {
                    Text(next.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        classWhen(next.date, next.startTime),
                        style = MaterialTheme.typography.bodySmall,
                        color = Info,
                    )
                } else {
                    Text(
                        "No tenés clases agendadas",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text("Ver calendario", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                }
            }
            Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = TextTertiary)
        }
    }
}

private fun classWhen(date: LocalDate, time: String?): String {
    val today = LocalDate.now()
    val day = when (date) {
        today -> "Hoy"
        today.plusDays(1) -> "Mañana"
        else -> date.format(DateTimeFormatter.ofPattern("EEEE d MMM", ES)).replaceFirstChar { it.uppercase() }
    }
    return listOfNotNull(day, time?.take(5)).joinToString(" · ")
}

@Composable
private fun DailyMessageCard() {
    val accent = LocalAstrimAccent.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .clip(Radii.card)
            .background(MaterialTheme.colorScheme.surface),
    ) {
        Box(
            Modifier
                .width(3.dp)
                .fillMaxHeight()
                .background(accent.base),
        )
        Column(Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.FormatQuote, null, tint = accent.base, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Eyebrow("Mensaje del día")
            }
            Spacer(Modifier.height(8.dp))
            Text(
                messageOfTheDay(),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

/**
 * Semana actual (lun–dom). Hoy: contorno lima. Día con entrenamiento
 * registrado: relleno lima + punto. Datos reales de workoutSessions.
 */
@Composable
private fun WeekStrip(trainedDays: Set<LocalDate>, modifier: Modifier = Modifier) {
    val accent = LocalAstrimAccent.current
    val today = LocalDate.now()
    val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    val labels = listOf("L", "M", "M", "J", "V", "S", "D")
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        labels.forEachIndexed { i, d ->
            val date = monday.plusDays(i.toLong())
            val isToday = date == today
            val trained = date in trainedDays
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(Radii.tile)
                    .background(if (trained) accent.base else MaterialTheme.colorScheme.surface)
                    .border(
                        1.dp,
                        when {
                            trained -> accent.base
                            isToday -> accent.base
                            else -> MaterialTheme.colorScheme.outline
                        },
                        Radii.tile,
                    )
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    d,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (trained) accent.onAccent else if (isToday) accent.base else TextTertiary,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    date.dayOfMonth.toString(),
                    style = MaterialTheme.typography.titleMedium,
                    color = if (trained) accent.onAccent else MaterialTheme.colorScheme.onSurface,
                    fontWeight = if (isToday || trained) FontWeight.Bold else FontWeight.Medium,
                )
                Spacer(Modifier.height(4.dp))
                Box(
                    Modifier
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                trained -> accent.onAccent
                                isToday -> accent.base
                                else -> androidx.compose.ui.graphics.Color.Transparent
                            },
                        ),
                )
            }
        }
    }
    Spacer(Modifier.height(8.dp))
    val count = trainedDays.count { !it.isBefore(monday) }
    Text(
        when (count) {
            0 -> "Todavía no entrenaste esta semana."
            1 -> "1 día entrenado esta semana."
            else -> "$count días entrenados esta semana."
        },
        style = MaterialTheme.typography.bodySmall,
        color = if (count > 0) Positive else TextTertiary,
    )
}

internal fun goalLabel(raw: String?): String? = when (raw?.uppercase()) {
    null, "" -> null
    "FAT_LOSS" -> "Pérdida de grasa"
    "MUSCLE_GAIN" -> "Ganancia muscular"
    "STRENGTH" -> "Fuerza"
    "ENDURANCE" -> "Resistencia"
    "MAINTENANCE" -> "Mantenimiento"
    "OTHER" -> "Otro"
    else -> raw
}
