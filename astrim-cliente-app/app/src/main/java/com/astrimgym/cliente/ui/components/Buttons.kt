package com.astrimgym.cliente.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.audio.Sfx
import com.astrimgym.cliente.audio.rememberSounds
import com.astrimgym.cliente.ui.theme.Danger
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.Motion
import com.astrimgym.cliente.ui.theme.Radii
import com.astrimgym.cliente.ui.theme.SurfacePressed
import com.astrimgym.cliente.ui.theme.TextTertiary

/** Escala sutil al presionar; compartida por todos los botones. */
@Composable
private fun pressScale(pressed: Boolean, active: Boolean, to: Float = 0.97f): Float {
    val scale by animateFloatAsState(
        targetValue = if (pressed && active) to else 1f,
        animationSpec = tween(Motion.PRESS),
        label = "press",
    )
    return scale
}

/**
 * Botón principal: relleno lima sólido, texto oscuro, sin resplandor
 * permanente. Al presionar se oscurece y escala apenas. Un único componente
 * para "INICIAR ENTRENAMIENTO", "COMPLETAR SERIE", etc.
 */
@Composable
fun AstrimButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
    height: Dp = 56.dp,
    /** Color de relleno alternativo (p. ej. verde de éxito). Por defecto, lima. */
    container: Color? = null,
    /** Sonido al pulsar. `null` = lo maneja la pantalla (evita duplicados). */
    sound: Sfx? = Sfx.TAP,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val sounds = rememberSounds()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val active = enabled && !loading
    val scale = pressScale(pressed, active)

    val base = container ?: accent.base
    val bg by animateColorAsState(
        when {
            !active -> SurfacePressed
            pressed -> darken(base, 0.18f)
            else -> base
        },
        animationSpec = tween(Motion.PRESS),
        label = "btnBg",
    )
    val contentColor = if (active) accent.onAccent else TextTertiary

    Box(
        modifier = modifier
            .heightIn(min = height)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(Radii.button)
            .background(bg)
            .pressable(enabled = active, interaction = interaction) {
                haptics.press()
                sound?.let(sounds::play)
                onClick()
            }
            .semantics { role = Role.Button }
            .padding(horizontal = 20.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                color = TextTertiary,
                strokeWidth = 2.dp,
                modifier = Modifier.size(22.dp),
            )
        } else {
            CompositionLocalProvider(LocalContentColor provides contentColor) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    icon?.let { Icon(it, contentDescription = null, tint = contentColor, modifier = Modifier.size(22.dp)) }
                    Text(
                        text.uppercase(),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = contentColor,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

/**
 * Botón secundario: superficie elevada con borde fino. `danger = true` lo
 * tiñe de rojo para acciones destructivas o de salida.
 */
@Composable
fun AstrimOutlineButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 52.dp,
    icon: ImageVector? = null,
    danger: Boolean = false,
    sound: Sfx? = Sfx.TAP,
) {
    val haptics = rememberHaptics()
    val sounds = rememberSounds()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale = pressScale(pressed, enabled)
    val fg = when {
        !enabled -> TextTertiary
        danger -> Danger
        else -> MaterialTheme.colorScheme.onSurface
    }
    val bg by animateColorAsState(
        if (pressed) MaterialTheme.colorScheme.surfaceContainerHigh else MaterialTheme.colorScheme.surface,
        animationSpec = tween(Motion.PRESS),
        label = "outlineBg",
    )
    Box(
        modifier = modifier
            .heightIn(min = height)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(Radii.button)
            .background(bg)
            .border(
                BorderStroke(1.dp, if (danger) Danger.copy(alpha = 0.35f) else MaterialTheme.colorScheme.outline),
                Radii.button,
            )
            .pressable(enabled = enabled, interaction = interaction) {
                haptics.tick()
                sound?.let(sounds::play)
                onClick()
            }
            .semantics { role = Role.Button }
            .padding(horizontal = 20.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            icon?.let { Icon(it, contentDescription = null, tint = fg, modifier = Modifier.size(20.dp)) }
            Text(
                text.uppercase(),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = fg,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** Pill compacta (acciones terciarias: "−15 s", "+15 s", filtros). Mín. 48 dp de alto. */
@Composable
fun AstrimPillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    icon: ImageVector? = null,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val sounds = rememberSounds()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale = pressScale(pressed, true, 0.95f)
    Box(
        modifier = modifier
            .heightIn(min = 48.dp)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(Radii.pill)
            .background(if (selected) accent.soft else MaterialTheme.colorScheme.surfaceContainerHigh)
            .border(
                BorderStroke(1.dp, if (selected) accent.border else MaterialTheme.colorScheme.outline),
                Radii.pill,
            )
            .pressable(enabled = true, interaction = interaction) {
                haptics.tick()
                sounds.play(Sfx.TAP)
                onClick()
            }
            .semantics { role = Role.Button }
            .padding(horizontal = 20.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            icon?.let {
                Icon(
                    it,
                    contentDescription = null,
                    tint = if (selected) accent.base else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.size(18.dp),
                )
            }
            Text(
                text,
                style = MaterialTheme.typography.labelLarge,
                color = if (selected) accent.base else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

/**
 * Botón circular de ícono (48 dp de área táctil). `tone` define el color del
 * ícono; el fondo siempre es superficie para no competir con la acción
 * principal.
 */
@Composable
fun AstrimIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.onSurface,
    size: Dp = 48.dp,
    container: Color = MaterialTheme.colorScheme.surfaceContainerHigh,
    bordered: Boolean = false,
    sound: Sfx? = Sfx.TAP,
) {
    val haptics = rememberHaptics()
    val sounds = rememberSounds()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale = pressScale(pressed, true, 0.92f)
    Box(
        modifier = modifier
            .size(size)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(Radii.pill)
            .background(container)
            .then(
                if (bordered) Modifier.border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline), Radii.pill)
                else Modifier,
            )
            .pressable(enabled = true, interaction = interaction) {
                haptics.tick()
                sound?.let(sounds::play)
                onClick()
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = contentDescription, tint = tint, modifier = Modifier.size(size * 0.46f))
    }
}

internal fun darken(color: Color, t: Float) = Color(
    red = color.red * (1 - t),
    green = color.green * (1 - t),
    blue = color.blue * (1 - t),
    alpha = color.alpha,
)
