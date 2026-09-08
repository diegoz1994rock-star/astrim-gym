package com.astrimgym.cliente.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.audio.Sfx
import com.astrimgym.cliente.audio.rememberSounds
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

private val PrimaryShape = RoundedCornerShape(20.dp)
private val OutlineShape = RoundedCornerShape(18.dp)

/**
 * Botón principal de la app. Relleno de acento con leve degradado, glow
 * suave detrás, micro-animación de escala al presionar y feedback háptico.
 * Un único componente para "INICIAR ENTRENAMIENTO", "COMPLETAR SERIE", etc.
 */
@Composable
fun AstrimButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: (@Composable () -> Unit)? = null,
    height: Dp = 56.dp,
    glow: Boolean = true,
    /** Sonido al pulsar. `null` = lo maneja la pantalla (evita duplicados). */
    sound: Sfx? = Sfx.TAP,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val sounds = rememberSounds()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val active = enabled && !loading
    val scale by animateFloatAsState(
        targetValue = if (pressed && active) 0.97f else 1f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 900f),
        label = "press",
    )

    val contentColor = if (active) accent.onAccent else MaterialTheme.colorScheme.onSurfaceVariant

    Box(
        modifier = modifier
            .heightIn(min = height)
            .scale(scale)
            .then(
                if (glow && active) Modifier.shadow(
                    elevation = 22.dp,
                    shape = PrimaryShape,
                    ambientColor = accent.base,
                    spotColor = accent.base,
                ) else Modifier,
            )
            .clip(PrimaryShape)
            .background(
                if (active) Brush.verticalGradient(
                    listOf(accent.base, darken(accent.base, 0.16f)),
                ) else Brush.verticalGradient(
                    listOf(Color(0xFF23262C), Color(0xFF1C1F24)),
                ),
            )
            .pressable(enabled = active, interaction = interaction) {
                haptics.press()
                sound?.let(sounds::play)
                onClick()
            }
            .padding(horizontal = 20.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                color = contentColor,
                strokeWidth = 2.dp,
                modifier = Modifier.size(22.dp),
            )
        } else {
            CompositionLocalProvider(LocalContentColor provides contentColor) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    icon?.invoke()
                    Text(
                        text.uppercase(),
                        style = MaterialTheme.typography.labelLarge,
                        color = contentColor,
                    )
                }
            }
        }
    }
}

/** Botón secundario: contorno fino sobre superficie, sin relleno de acento. */
@Composable
fun AstrimOutlineButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 52.dp,
    sound: Sfx? = Sfx.TAP,
) {
    val haptics = rememberHaptics()
    val sounds = rememberSounds()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && enabled) 0.97f else 1f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 900f),
        label = "press",
    )
    Box(
        modifier = modifier
            .heightIn(min = height)
            .scale(scale)
            .clip(OutlineShape)
            .background(MaterialTheme.colorScheme.surface)
            .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline), OutlineShape)
            .pressable(enabled = enabled, interaction = interaction) {
                haptics.tick()
                sound?.let(sounds::play)
                onClick()
            }
            .padding(horizontal = 20.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text.uppercase(),
            style = MaterialTheme.typography.labelLarge,
            color = if (enabled) MaterialTheme.colorScheme.onSurface
            else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Pill compacta (acciones terciarias: "-15 s", "+15 s", filtros). */
@Composable
fun AstrimPillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    leadingIcon: (@Composable () -> Unit)? = null,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val sounds = rememberSounds()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.94f else 1f, label = "press")
    val shape = RoundedCornerShape(50)
    Box(
        modifier = modifier
            .scale(scale)
            .clip(shape)
            .background(if (selected) accent.soft else MaterialTheme.colorScheme.surface)
            .border(
                BorderStroke(1.dp, if (selected) accent.border else MaterialTheme.colorScheme.outline),
                shape,
            )
            .pressable(enabled = true, interaction = interaction) {
                haptics.tick()
                sounds.play(Sfx.TAP)
                onClick()
            }
            .padding(horizontal = 18.dp, vertical = 11.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            leadingIcon?.invoke()
            Text(
                text,
                style = MaterialTheme.typography.labelLarge,
                color = if (selected) accent.base else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

private fun darken(color: Color, t: Float) = Color(
    red = color.red * (1 - t),
    green = color.green * (1 - t),
    blue = color.blue * (1 - t),
    alpha = color.alpha,
)
