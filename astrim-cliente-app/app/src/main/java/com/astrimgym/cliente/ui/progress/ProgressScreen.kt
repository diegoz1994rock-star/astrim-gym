package com.astrimgym.cliente.ui.progress

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.data.repository.ProgressData
import com.astrimgym.cliente.data.repository.ProgressRepository
import com.astrimgym.cliente.data.repository.WorkoutSummary
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.EmptyState
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import java.time.format.DateTimeFormatter
import java.util.Locale

private val ES = Locale("es")
private val DAY_FMT = DateTimeFormatter.ofPattern("EEE d MMM", ES)

@Composable
fun ProgressScreen(progressRepository: ProgressRepository) {
    val viewModel: ProgressViewModel =
        viewModel(factory = ViewModelFactory { ProgressViewModel(progressRepository) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(title = "Progreso")
        when (val s = state) {
            is ProgressUiState.Loading -> LoadingState()
            is ProgressUiState.Error -> ErrorState(s.message, onRetry = viewModel::refresh)
            is ProgressUiState.Success ->
                if (!s.data.hasAnything) {
                    EmptyState(
                        title = "Sin datos todavía",
                        message = "Cuando termines tu primer entrenamiento vas a ver acá tu evolución, récords y objetivos.",
                        glyph = "↗",
                    )
                } else {
                    ProgressContent(s.data)
                }
        }
    }
}

@Composable
private fun ProgressContent(data: ProgressData) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(4.dp))

        val week = data.thisWeekCount()
        val streak = data.weekStreak()
        Row(
            modifier = Modifier.height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            StatTile("Esta semana", "$week", plural(week, "entreno", "entrenos"), Modifier.weight(1f).fillMaxHeight())
            StatTile("Racha", "$streak", plural(streak, "semana", "semanas"), Modifier.weight(1f).fillMaxHeight())
        }
        Spacer(Modifier.height(12.dp))
        Row(
            modifier = Modifier.height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            StatTile("Total", "${data.sessions.size}", plural(data.sessions.size, "entreno", "entrenos"), Modifier.weight(1f).fillMaxHeight())
            StatTile("Volumen 30 d", formatKg(data.volumeLast30d()), "levantados", Modifier.weight(1f).fillMaxHeight())
        }

        Spacer(Modifier.height(16.dp))
        WeeklyChartCard(data)

        val latest = data.latestMeasurement
        if (latest != null) {
            Spacer(Modifier.height(20.dp))
            Eyebrow("Tu cuerpo")
            Spacer(Modifier.height(4.dp))
            Text(
                "Última medición: ${latest.date.format(DAY_FMT).replaceFirstChar { it.uppercase() }}"
                    + (data.measurements.size.takeIf { it > 1 }?.let { "  ·  $it registros" } ?: ""),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(10.dp))
            BodyCompositionCard(data)
            if (latest.hasAnyCircumference) {
                Spacer(Modifier.height(12.dp))
                MeasurementsCard(data)
            }
            if (data.weights.size >= 2) {
                Spacer(Modifier.height(12.dp))
                WeightCard(data)
            }
            latest.notes?.let {
                Spacer(Modifier.height(12.dp))
                AstrimCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "NOTA DEL GIMNASIO",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        Eyebrow("Historial")
        Spacer(Modifier.height(10.dp))
        data.sessions.take(20).forEach { s ->
            SessionRow(s, Modifier.fillMaxWidth().padding(bottom = 10.dp))
        }

        Spacer(Modifier.height(BottomBarSpace))
    }
}

@Composable
private fun StatTile(label: String, value: String, unit: String, modifier: Modifier = Modifier) {
    AstrimCard(modifier = modifier, contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            value,
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Text(
            unit,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun WeeklyChartCard(data: ProgressData) {
    val accent = LocalAstrimAccent.current
    val buckets = data.weeklyBuckets(8)
    val maxSessions = (buckets.maxOfOrNull { it.sessions } ?: 0).coerceAtLeast(1)
    val trackColor = MaterialTheme.colorScheme.surfaceContainerHigh

    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Entrenos por semana")
        Spacer(Modifier.height(4.dp))
        Text(
            "Últimas 8 semanas",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(16.dp))
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(120.dp),
        ) {
            val n = buckets.size
            val gap = 10.dp.toPx()
            val barW = (size.width - gap * (n - 1)) / n
            buckets.forEachIndexed { i, b ->
                val x = i * (barW + gap)
                val h = size.height * 0.92f * (b.sessions / maxSessions.toFloat())
                // pista
                drawRoundRect(
                    color = trackColor,
                    topLeft = Offset(x, 0f),
                    size = Size(barW, size.height),
                    cornerRadius = CornerRadius(6.dp.toPx()),
                )
                if (h > 0f) {
                    drawRoundRect(
                        color = accent.base,
                        topLeft = Offset(x, size.height - h),
                        size = Size(barW, h),
                        cornerRadius = CornerRadius(6.dp.toPx()),
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth()) {
            buckets.forEach { b ->
                Text(
                    b.weekStart.format(DateTimeFormatter.ofPattern("d/M", ES)),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

private enum class Better { LOWER, HIGHER, NEUTRAL }

@Composable
private fun BodyCompositionCard(data: ProgressData) {
    val last = data.latestMeasurement ?: return
    val first = data.firstMeasurement
    fun delta(sel: (com.astrimgym.cliente.data.repository.MeasurementPoint) -> Double?): Double? {
        if (first == null || first === last) return null
        val a = sel(first) ?: return null
        val b = sel(last) ?: return null
        return b - a
    }
    val bmi = data.latestBmi()

    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Composición corporal")
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            last.weight?.let {
                MetricBox("Peso", "${trimNum(it)} kg", delta { m -> m.weight }, "kg", Better.LOWER, Modifier.weight(1f))
            }
            bmi?.let {
                MetricBox("IMC", trimNum(it), null, bmiLabel(it), Better.NEUTRAL, Modifier.weight(1f))
            }
        }
        if ((last.bodyFat != null) || (last.muscleMass != null)) {
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                last.bodyFat?.let {
                    MetricBox("% Grasa", "${trimNum(it)}%", delta { m -> m.bodyFat }, "", Better.LOWER, Modifier.weight(1f))
                }
                last.muscleMass?.let {
                    MetricBox("Masa muscular", "${trimNum(it)} kg", delta { m -> m.muscleMass }, "kg", Better.HIGHER, Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun MetricBox(
    label: String,
    value: String,
    delta: Double?,
    deltaUnit: String,
    better: Better,
    modifier: Modifier = Modifier,
) {
    Column(modifier) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(4.dp))
        Text(value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Bold)
        if (delta != null && delta != 0.0) {
            val arrow = if (delta > 0) "▲" else "▼"
            val good = when (better) {
                Better.LOWER -> delta < 0
                Better.HIGHER -> delta > 0
                Better.NEUTRAL -> false
            }
            Text(
                "$arrow ${trimNum(kotlin.math.abs(delta))}${if (deltaUnit.isNotBlank()) " $deltaUnit" else ""}",
                style = MaterialTheme.typography.bodySmall,
                color = if (better == Better.NEUTRAL) MaterialTheme.colorScheme.onSurfaceVariant
                    else if (good) LocalAstrimAccent.current.base
                    else MaterialTheme.colorScheme.tertiary,
            )
        } else if (better == Better.NEUTRAL && deltaUnit.isNotBlank()) {
            Text(deltaUnit, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun MeasurementsCard(data: ProgressData) {
    val last = data.latestMeasurement ?: return
    val first = data.firstMeasurement
    val rows = listOf<Triple<String, Double?, (com.astrimgym.cliente.data.repository.MeasurementPoint) -> Double?>>(
        Triple("Cintura", last.waist) { it.waist },
        Triple("Pecho", last.chest) { it.chest },
        Triple("Brazo", last.arm) { it.arm },
        Triple("Muslo", last.leg) { it.leg },
        Triple("Cadera", last.hip) { it.hip },
        Triple("Pantorrilla", last.calf) { it.calf },
    ).filter { it.second != null }

    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Medidas corporales")
        Spacer(Modifier.height(8.dp))
        rows.forEach { (label, value, sel) ->
            val d = if (first != null && first !== last) {
                val a = sel(first); val b = sel(last)
                if (a != null && b != null) b - a else null
            } else null
            Row(
                Modifier.fillMaxWidth().padding(vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                Text(
                    "${trimNum(value!!)} cm",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.SemiBold,
                )
                if (d != null && d != 0.0) {
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "${if (d > 0) "▲" else "▼"} ${trimNum(kotlin.math.abs(d))}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

private fun bmiLabel(bmi: Double): String = when {
    bmi < 18.5 -> "Bajo peso"
    bmi < 25 -> "Normal"
    bmi < 30 -> "Sobrepeso"
    else -> "Obesidad"
}

@Composable
private fun WeightCard(data: ProgressData) {
    val first = data.weights.first()
    val last = data.weights.last()
    val delta = last.weight - first.weight
    val sign = if (delta > 0) "+" else ""
    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Peso corporal")
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                "${trimNum(last.weight)} kg",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Spacer(Modifier.weight(1f))
            Text(
                "$sign${trimNum(delta)} kg",
                style = MaterialTheme.typography.titleMedium,
                color = if (delta > 0) MaterialTheme.colorScheme.tertiary else LocalAstrimAccent.current.base,
            )
        }
        Text(
            "desde ${first.date.format(DAY_FMT)}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SessionRow(s: WorkoutSummary, modifier: Modifier = Modifier) {
    AstrimCard(modifier = modifier, contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    s.routineName,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    s.date.format(DAY_FMT).replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    durationLabel(s.durationSeconds),
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                val extra = buildList {
                    if (s.totalSets > 0) add("${s.totalSets} ${plural(s.totalSets, "serie", "series")}")
                    if (s.totalVolume > 0) add("${s.totalVolume.toInt()} kg")
                }
                if (extra.isNotEmpty()) {
                    Text(
                        extra.joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

private fun formatKg(v: Double): String = when {
    v >= 1000 -> "${trimNum(v / 1000)} t"
    else -> "${v.toInt()} kg"
}

private fun trimNum(v: Double): String = if (v % 1.0 == 0.0) v.toInt().toString() else "%.1f".format(v)

private fun plural(n: Int, one: String, many: String) = if (n == 1) one else many

private fun durationLabel(seconds: Long): String = when {
    seconds <= 0 -> "—"
    seconds < 60 -> "<1 min"
    else -> "${seconds / 60} min"
}
