package com.astrimgym.cliente.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.Motion
import com.astrimgym.cliente.ui.theme.Radii
import com.astrimgym.cliente.ui.theme.TextSecondary
import com.astrimgym.cliente.ui.theme.TextTertiary

/**
 * Tarjeta estándar: superficie sólida, borde fino de bajo contraste, radio
 * 22 dp. `hero = true` = tarjeta protagonista (superficie elevada); la
 * jerarquía sale del tono, no de sombras ni resplandores.
 */
@Composable
fun AstrimCard(
    modifier: Modifier = Modifier,
    hero: Boolean = false,
    onClick: (() -> Unit)? = null,
    contentPadding: PaddingValues = PaddingValues(20.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val haptics = rememberHaptics()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && onClick != null) 0.985f else 1f,
        animationSpec = tween(Motion.PRESS),
        label = "cardPress",
    )

    val base = Modifier
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .clip(Radii.card)
        .background(if (hero) MaterialTheme.colorScheme.surfaceContainerHigh else MaterialTheme.colorScheme.surface)
        .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline), Radii.card)

    val clickable = if (onClick != null) {
        base.pressable(enabled = true, interaction = interaction) {
            haptics.tick(); onClick()
        }
    } else base

    Column(modifier = modifier.then(clickable).padding(contentPadding), content = content)
}

/** Etiqueta corta en mayúsculas sobre un título. Neutra por defecto; lima solo si se pide. */
@Composable
fun Eyebrow(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = TextSecondary,
) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = color,
        modifier = modifier,
    )
}

/** Eyebrow en lima, para el dato protagonista de una tarjeta. */
@Composable
fun AccentEyebrow(text: String, modifier: Modifier = Modifier) =
    Eyebrow(text, modifier, LocalAstrimAccent.current.base)

/** Cabecera de sección: título + acción opcional a la derecha. */
@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.weight(1f),
        )
        if (action != null && onAction != null) {
            val haptics = rememberHaptics()
            val interaction = remember { MutableInteractionSource() }
            Text(
                action,
                style = MaterialTheme.typography.labelLarge,
                color = LocalAstrimAccent.current.base,
                modifier = Modifier
                    .clip(Radii.pill)
                    .pressable(interaction = interaction) { haptics.tick(); onAction() }
                    .padding(horizontal = 10.dp, vertical = 8.dp),
            )
        }
    }
}

/** Tono de un chip informativo. */
enum class ChipTone { NEUTRAL, ACCENT, SUCCESS, INFO, WARNING, DANGER }

/** Chip informativo compacto (grupo muscular, equipo, estado...). */
@Composable
fun InfoChip(
    text: String,
    modifier: Modifier = Modifier,
    tone: ChipTone = ChipTone.NEUTRAL,
    icon: ImageVector? = null,
) {
    val color = toneColor(tone)
    val bg = if (tone == ChipTone.NEUTRAL) MaterialTheme.colorScheme.surfaceContainerHigh else color.copy(alpha = 0.12f)
    val border = if (tone == ChipTone.NEUTRAL) MaterialTheme.colorScheme.outline else color.copy(alpha = 0.28f)
    Row(
        modifier = modifier
            .clip(Radii.pill)
            .background(bg)
            .border(BorderStroke(1.dp, border), Radii.pill)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
        }
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            color = color,
        )
    }
}

@Composable
fun toneColor(tone: ChipTone): Color = when (tone) {
    ChipTone.NEUTRAL -> TextSecondary
    ChipTone.ACCENT -> LocalAstrimAccent.current.base
    ChipTone.SUCCESS -> com.astrimgym.cliente.ui.theme.Positive
    ChipTone.INFO -> com.astrimgym.cliente.ui.theme.Info
    ChipTone.WARNING -> com.astrimgym.cliente.ui.theme.Warning
    ChipTone.DANGER -> com.astrimgym.cliente.ui.theme.Danger
}

/**
 * Ícono en una "baldosa" redondeada: ancla visual de tarjetas (rutina,
 * clase, plan). Nunca reemplaza a la etiqueta de texto.
 */
@Composable
fun IconTile(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    tint: Color = LocalAstrimAccent.current.base,
    size: androidx.compose.ui.unit.Dp = 44.dp,
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(Radii.tile)
            .background(tint.copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(size * 0.5f))
    }
}

/** Fila etiqueta / valor para tarjetas de datos. */
@Composable
fun KeyValueRow(label: String, value: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
        Spacer(Modifier.width(16.dp))
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

/** Texto terciario de apoyo (aclaraciones bajo una tarjeta). */
@Composable
fun FootNote(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = TextTertiary, modifier = modifier)
}

/** Separador fino dentro de una tarjeta. */
@Composable
fun HairlineDivider(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .height(1.dp)
            .background(MaterialTheme.colorScheme.outlineVariant),
    )
}

/** Columna con espaciado uniforme (azúcar para pantallas). */
@Composable
fun Stack(
    modifier: Modifier = Modifier,
    gap: androidx.compose.ui.unit.Dp = 12.dp,
    content: @Composable ColumnScope.() -> Unit,
) = Column(modifier, verticalArrangement = Arrangement.spacedBy(gap), content = content)
