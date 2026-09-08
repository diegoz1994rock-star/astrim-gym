package com.astrimgym.cliente.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

/**
 * Anillo de progreso circular premium: pista tenue + arco de acento con
 * degradado, extremo redondeado y un halo suave. El `progress` (0..1) se
 * anima siempre, así el descanso "respira" en vez de saltar cada segundo.
 * Slot central libre (contador, ícono...).
 */
@Composable
fun ProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    diameter: Dp = 240.dp,
    stroke: Dp = 12.dp,
    animate: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    val accent = LocalAstrimAccent.current
    val target = progress.coerceIn(0f, 1f)
    val shown by animateFloatAsState(
        targetValue = target,
        animationSpec = if (animate) tween(650) else tween(0),
        label = "ring",
    )

    Box(modifier = modifier.size(diameter), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(diameter)) {
            val strokePx = stroke.toPx()
            val inset = strokePx / 2f
            val arcSize = Size(size.width - strokePx, size.height - strokePx)
            val topLeft = Offset(inset, inset)

            // Pista
            drawArc(
                color = accent.base.copy(alpha = 0.09f),
                startAngle = -90f, sweepAngle = 360f, useCenter = false,
                topLeft = topLeft, size = arcSize,
                style = Stroke(width = strokePx),
            )
            // Halo
            if (shown > 0f) {
                drawArc(
                    color = accent.base.copy(alpha = 0.14f),
                    startAngle = -90f, sweepAngle = 360f * shown, useCenter = false,
                    topLeft = topLeft, size = arcSize,
                    style = Stroke(width = strokePx * 1.7f, cap = StrokeCap.Round),
                )
            }
            // Progreso
            drawArc(
                brush = Brush.sweepGradient(
                    listOf(
                        accent.base.copy(alpha = 0.65f),
                        accent.base,
                        accent.base.copy(alpha = 0.65f),
                    ),
                ),
                startAngle = -90f, sweepAngle = 360f * shown, useCenter = false,
                topLeft = topLeft, size = arcSize,
                style = Stroke(width = strokePx, cap = StrokeCap.Round),
            )
        }
        content()
    }
}

/**
 * Barra de progreso lineal delgada: pista tenue + relleno de acento animado.
 * Se usa para las metas de macros/categorías de "Progreso de hoy" (ej.
 * "Proteína 125 / 180 g").
 */
@Composable
fun MacroProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    height: Dp = 8.dp,
) {
    val accent = LocalAstrimAccent.current
    val target = progress.coerceIn(0f, 1f)
    val shown by animateFloatAsState(targetValue = target, animationSpec = tween(500), label = "macroBar")
    Box(
        modifier
            .fillMaxWidth()
            .height(height)
            .clip(CircleShape)
            .background(accent.base.copy(alpha = 0.12f)),
    ) {
        Box(
            Modifier
                .fillMaxWidth(shown)
                .height(height)
                .clip(CircleShape)
                .background(accent.base),
        )
    }
}
