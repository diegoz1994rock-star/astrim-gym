package com.astrimgym.cliente.ui.agenda

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.EventBusy
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.repository.AgendaData
import com.astrimgym.cliente.data.repository.AgendaRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.IconTile
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.components.rememberHaptics
import com.astrimgym.cliente.ui.theme.ClassBlue
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

private val ES = Locale("es")

@Composable
fun AgendaScreen(agendaRepository: AgendaRepository) {
    val viewModel: AgendaViewModel =
        viewModel(factory = ViewModelFactory { AgendaViewModel(agendaRepository) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(title = "Clases", subtitle = "Tu semana en el gimnasio")
        when (val s = state) {
            is AgendaUiState.Loading -> LoadingState()
            is AgendaUiState.Error -> ErrorState(s.message, onRetry = viewModel::refresh)
            is AgendaUiState.Success -> AgendaContent(
                data = s.data,
                month = s.visibleMonth,
                selected = s.selectedDay,
                onSelectDay = viewModel::selectDay,
                onMonth = viewModel::changeMonth,
            )
        }
    }
}

@Composable
private fun AgendaContent(
    data: AgendaData,
    month: YearMonth,
    selected: LocalDate,
    onSelectDay: (LocalDate) -> Unit,
    onMonth: (Long) -> Unit,
) {
    var showMonth by rememberSaveable { mutableStateOf(false) }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        // 1) Semana (lo que más se consulta): días con clase / entrenados.
        WeekSelector(data, selected, onSelectDay)
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            LegendDot(ClassBlue, "Clase")
            Spacer(Modifier.size(16.dp))
            LegendDot(LocalAstrimAccent.current.base, "Entrenaste")
        }

        // 2) Detalle del día elegido.
        Spacer(Modifier.height(20.dp))
        DayDetail(data, selected)

        // 3) Próximas actividades.
        val upcoming = data.upcomingClasses(LocalDate.now())
        Spacer(Modifier.height(24.dp))
        Eyebrow("Próximas clases")
        Spacer(Modifier.height(10.dp))
        if (upcoming.isEmpty()) {
            AstrimCard(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconTile(Icons.Outlined.EventBusy, tint = ClassBlue)
                    Spacer(Modifier.size(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text("No tenés clases programadas", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                        Text(
                            "Cuando tu gimnasio te inscriba en una clase, aparece acá y marcada en azul.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        } else {
            upcoming.forEach { c ->
                ClassRow(
                    title = c.name,
                    time = c.startTime,
                    dateLabel = relativeDay(c.date),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                )
            }
        }

        // 4) Mes completo, plegado: no domina la pantalla.
        Spacer(Modifier.height(14.dp))
        AstrimCard(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            onClick = { showMonth = !showMonth },
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.CalendarMonth, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                Spacer(Modifier.size(10.dp))
                Text(
                    if (showMonth) "Ocultar calendario del mes" else "Ver calendario del mes",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    if (showMonth) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                    null, tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            AnimatedVisibility(visible = showMonth) {
                Column {
                    Spacer(Modifier.height(14.dp))
                    MonthCalendar(data, month, selected, onSelectDay, onMonth)
                }
            }
        }

        Spacer(Modifier.height(BottomBarSpace))
    }
}

/**
 * Selector semanal (lun–dom) de la semana del día elegido, con flechas para
 * cambiar de semana. Día elegido en lima; hoy con contorno; punto azul =
 * clase, punto lima = entrenaste.
 */
@Composable
private fun WeekSelector(data: AgendaData, selected: LocalDate, onSelectDay: (LocalDate) -> Unit) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val today = LocalDate.now()
    val monday = selected.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
    val sunday = monday.plusDays(6)
    val range = if (monday.month == sunday.month) {
        "${monday.dayOfMonth} – ${sunday.dayOfMonth} ${sunday.month.getDisplayName(TextStyle.FULL, ES)}"
    } else {
        "${monday.dayOfMonth} ${monday.month.getDisplayName(TextStyle.SHORT, ES)} – ${sunday.dayOfMonth} ${sunday.month.getDisplayName(TextStyle.SHORT, ES)}"
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Eyebrow(if (!today.isBefore(monday) && !today.isAfter(sunday)) "Esta semana" else "Semana")
            Text(range, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
        }
        NavArrow(Icons.Rounded.ChevronLeft, "Semana anterior") { haptics.tick(); onSelectDay(selected.minusWeeks(1)) }
        Spacer(Modifier.size(8.dp))
        NavArrow(Icons.Rounded.ChevronRight, "Semana siguiente") { haptics.tick(); onSelectDay(selected.plusWeeks(1)) }
    }
    Spacer(Modifier.height(12.dp))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        for (i in 0..6) {
            val date = monday.plusDays(i.toLong())
            val isSel = date == selected
            val isToday = date == today
            val hasClass = date in data.classDays
            val trained = date in data.workoutDays
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(com.astrimgym.cliente.ui.theme.Radii.tile)
                    .background(if (isSel) accent.base else MaterialTheme.colorScheme.surface)
                    .border(
                        1.dp,
                        if (isSel || isToday) accent.base else MaterialTheme.colorScheme.outline,
                        com.astrimgym.cliente.ui.theme.Radii.tile,
                    )
                    .clickable { haptics.tick(); onSelectDay(date) }
                    .padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    date.dayOfWeek.getDisplayName(TextStyle.SHORT, ES).take(3).replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isSel) accent.onAccent else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    date.dayOfMonth.toString(),
                    style = MaterialTheme.typography.titleMedium,
                    color = if (isSel) accent.onAccent else MaterialTheme.colorScheme.onSurface,
                    fontWeight = if (isSel || isToday) FontWeight.Bold else FontWeight.Medium,
                )
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    Dot(if (hasClass) (if (isSel) accent.onAccent else ClassBlue) else androidx.compose.ui.graphics.Color.Transparent)
                    if (trained) Dot(if (isSel) accent.onAccent else accent.base)
                }
            }
        }
    }
}

@Composable
private fun Dot(color: androidx.compose.ui.graphics.Color) {
    Box(Modifier.size(5.dp).clip(CircleShape).background(color))
}

private fun relativeDay(date: LocalDate): String {
    val today = LocalDate.now()
    return when (date) {
        today -> "Hoy"
        today.plusDays(1) -> "Mañana"
        else -> date.format(java.time.format.DateTimeFormatter.ofPattern("EEEE d MMM", ES)).replaceFirstChar { it.uppercase() }
    }
}

@Composable
private fun MonthCalendar(
    data: AgendaData,
    month: YearMonth,
    selected: LocalDate,
    onSelectDay: (LocalDate) -> Unit,
    onMonth: (Long) -> Unit,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val today = LocalDate.now()
    val classDays = data.classDays
    val workoutDays = data.workoutDays

    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            month.month.getDisplayName(TextStyle.FULL, ES).replaceFirstChar { it.uppercase() } +
                " " + month.year,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
        )
        NavArrow(Icons.Rounded.ChevronLeft, "Mes anterior") { haptics.tick(); onMonth(-1) }
        Spacer(Modifier.size(4.dp))
        NavArrow(Icons.Rounded.ChevronRight, "Mes siguiente") { haptics.tick(); onMonth(1) }
    }

    Spacer(Modifier.height(12.dp))
    Row(Modifier.fillMaxWidth()) {
        listOf("L", "M", "M", "J", "V", "S", "D").forEach {
            Text(
                it,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
        }
    }
    Spacer(Modifier.height(4.dp))

    val firstOffset = month.atDay(1).dayOfWeek.value - 1 // lunes = 0
    val daysInMonth = month.lengthOfMonth()
    val totalCells = ((firstOffset + daysInMonth + 6) / 7) * 7

    Column {
        for (row in 0 until totalCells / 7) {
            Row(Modifier.fillMaxWidth()) {
                for (col in 0 until 7) {
                    val cellIndex = row * 7 + col
                    val dayNum = cellIndex - firstOffset + 1
                    Box(Modifier.weight(1f).height(46.dp), contentAlignment = Alignment.Center) {
                        if (dayNum in 1..daysInMonth) {
                            val date = month.atDay(dayNum)
                            DayCell(
                                day = dayNum,
                                isToday = date == today,
                                isSelected = date == selected,
                                hasClass = date in classDays,
                                hasWorkout = date in workoutDays,
                                accent = accent,
                                onClick = { haptics.tick(); onSelectDay(date) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(
    day: Int,
    isToday: Boolean,
    isSelected: Boolean,
    hasClass: Boolean,
    hasWorkout: Boolean,
    accent: com.astrimgym.cliente.ui.theme.AstrimAccent,
    onClick: () -> Unit,
) {
    val bg = when {
        isSelected -> accent.base
        isToday -> accent.soft
        else -> androidx.compose.ui.graphics.Color.Transparent
    }
    val fg = when {
        isSelected -> accent.onAccent
        isToday -> accent.base
        else -> MaterialTheme.colorScheme.onSurface
    }
    // Azul = clase programada (prioridad); acento = día entrenado.
    val dotColor = when {
        isSelected -> androidx.compose.ui.graphics.Color.Transparent
        hasClass -> ClassBlue
        hasWorkout -> accent.base
        else -> androidx.compose.ui.graphics.Color.Transparent
    }
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(bg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                day.toString(),
                style = MaterialTheme.typography.bodyMedium,
                color = fg,
                fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
            )
            Box(
                Modifier
                    .padding(top = 2.dp)
                    .size(5.dp)
                    .clip(CircleShape)
                    .background(dotColor),
            )
        }
    }
}

@Composable
private fun LegendDot(color: androidx.compose.ui.graphics.Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(color),
        )
        Spacer(Modifier.size(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun DayDetail(data: AgendaData, day: LocalDate) {
    val classes = data.classesOn(day)
    val workouts = data.workoutsOn(day)
    val label = day.format(java.time.format.DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", ES))
        .replaceFirstChar { it.uppercase() }

    Eyebrow(label)
    Spacer(Modifier.height(10.dp))

    if (classes.isEmpty() && workouts.isEmpty()) {
        AstrimCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                if (day == LocalDate.now()) "Hoy no tenés clases. Buen día para tu rutina."
                else "Sin clases ni entrenamientos este día.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    classes.forEach { c ->
        ClassRow(
            title = c.name,
            time = c.startTime,
            dateLabel = null,
            modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
        )
    }
    workouts.forEach { w ->
        AstrimCard(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
            Text(
                "ENTRENAMIENTO REGISTRADO",
                style = MaterialTheme.typography.labelMedium,
                color = LocalAstrimAccent.current.base,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                w.routineName,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            val bits = buildList {
                when {
                    w.durationSeconds in 1..59 -> add("<1 min")
                    w.durationSeconds >= 60 -> add("${w.durationSeconds / 60} min")
                }
                if (w.totalVolume > 0) add("${w.totalVolume.toInt()} kg")
            }
            if (bits.isNotEmpty()) {
                Text(
                    bits.joinToString("  ·  "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ClassRow(title: String, time: String?, dateLabel: String?, modifier: Modifier = Modifier) {
    AstrimCard(modifier = modifier, contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(ClassBlue.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    time?.take(5) ?: "—",
                    style = MaterialTheme.typography.titleSmall,
                    color = ClassBlue,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    dateLabel ?: "Clase grupal",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun NavArrow(icon: androidx.compose.ui.graphics.vector.ImageVector, cd: String, onClick: () -> Unit) {
    Icon(
        icon,
        contentDescription = cd,
        tint = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .clickable(onClick = onClick)
            .padding(10.dp),
    )
}
