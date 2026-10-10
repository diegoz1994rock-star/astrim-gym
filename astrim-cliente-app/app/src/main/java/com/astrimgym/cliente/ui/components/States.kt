package com.astrimgym.cliente.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.ui.theme.Danger
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.LocalReducedMotion
import com.astrimgym.cliente.ui.theme.Positive
import com.astrimgym.cliente.ui.theme.TextSecondary

/** Indicador de carga discreto: arco lima girando. */
@Composable
fun AstrimSpinner(modifier: Modifier = Modifier, size: Dp = 36.dp) {
    val accent = LocalAstrimAccent.current
    val transition = rememberInfiniteTransition(label = "spinner")
    val angle by transition.animateFloat(
        initialValue = 0f, targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Restart),
        label = "angle",
    )
    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size).rotate(angle)) {
            drawArc(
                color = accent.base.copy(alpha = 0.14f),
                startAngle = 0f, sweepAngle = 360f, useCenter = false,
                style = Stroke(width = 3.dp.toPx()),
            )
            drawArc(
                color = accent.base,
                startAngle = 0f, sweepAngle = 90f, useCenter = false,
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round),
            )
        }
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier, label: String? = null) {
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        AstrimSpinner()
        if (label != null) {
            Spacer(Modifier.height(16.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
        }
    }
}

/**
 * Error con explicación y reintento. Si el mensaje habla de conexión se
 * muestra el ícono de "sin red" para que se entienda de un vistazo.
 */
@Composable
fun ErrorState(
    message: String,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val offline = listOf("conexi", "red", "internet", "offline", "unavailable")
        .any { message.lowercase().contains(it) }
    StateLayout(
        icon = if (offline) Icons.Rounded.CloudOff else Icons.Rounded.ErrorOutline,
        tint = if (offline) TextSecondary else Danger,
        title = if (offline) "Sin conexión" else "Algo salió mal",
        message = message,
        modifier = modifier,
    ) {
        if (onRetry != null) {
            AstrimOutlineButton("Reintentar", onRetry, icon = Icons.Rounded.Refresh)
        }
    }
}

/** Pantalla vacía elegante: ícono en círculo, título, explicación y acción opcional. */
@Composable
fun EmptyState(
    title: String,
    message: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    StateLayout(
        icon = icon,
        tint = LocalAstrimAccent.current.base,
        title = title,
        message = message,
        modifier = modifier,
        action = action,
    )
}

@Composable
private fun StateLayout(
    icon: ImageVector,
    tint: Color,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 32.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(tint.copy(alpha = 0.10f))
                .border(1.dp, tint.copy(alpha = 0.22f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(32.dp))
        }
        Spacer(Modifier.height(20.dp))
        Text(
            title,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(max = 320.dp),
        )
        if (action != null) {
            Spacer(Modifier.height(24.dp))
            action()
        }
    }
}

/**
 * Check de éxito animado: el círculo aparece con una escala corta y el
 * trazo del check se dibuja. Nunca bloquea: es solo decoración de estado.
 */
@Composable
fun AnimatedCheck(
    modifier: Modifier = Modifier,
    size: Dp = 96.dp,
    color: Color = Positive,
    delayMillis: Int = 0,
) {
    val reduced = LocalReducedMotion.current
    val circle = remember { Animatable(if (reduced) 1f else 0.6f) }
    val stroke = remember { Animatable(if (reduced) 1f else 0f) }
    LaunchedEffect(Unit) {
        if (reduced) return@LaunchedEffect
        kotlinx.coroutines.delay(delayMillis.toLong())
        circle.animateTo(1f, tween(220, easing = FastOutSlowInEasing))
        stroke.animateTo(1f, tween(260, easing = FastOutSlowInEasing))
    }
    Box(
        modifier = modifier
            .size(size)
            .scale(circle.value)
            .clip(CircleShape)
            .background(color.copy(alpha = 0.14f))
            .border(1.5.dp, color.copy(alpha = 0.45f), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.size(size * 0.46f)) {
            val w = this.size.width
            val h = this.size.height
            val path = Path().apply {
                moveTo(w * 0.10f, h * 0.52f)
                lineTo(w * 0.40f, h * 0.80f)
                lineTo(w * 0.92f, h * 0.22f)
            }
            val measure = PathMeasure().apply { setPath(path, false) }
            val partial = Path()
            measure.getSegment(0f, measure.length * stroke.value, partial, true)
            drawPath(
                partial,
                color = color,
                style = Stroke(width = 4.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round),
            )
        }
    }
}
