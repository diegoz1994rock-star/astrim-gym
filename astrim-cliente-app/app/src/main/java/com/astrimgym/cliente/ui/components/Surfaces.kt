package com.astrimgym.cliente.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

private val CardShape = RoundedCornerShape(24.dp)

/**
 * Tarjeta estándar de la app: superficie sutil, borde hairline, radio
 * generoso. `hero = true` la vuelve la tarjeta protagonista (fondo un poco
 * más claro + un tinte de acento apenas perceptible arriba).
 */
@Composable
fun AstrimCard(
    modifier: Modifier = Modifier,
    hero: Boolean = false,
    onClick: (() -> Unit)? = null,
    contentPadding: PaddingValues = PaddingValues(20.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && onClick != null) 0.985f else 1f,
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 800f),
        label = "cardPress",
    )

    val base = Modifier
        .scale(scale)
        .clip(CardShape)
        .background(
            if (hero) Brush.verticalGradient(
                listOf(
                    accent.base.copy(alpha = 0.10f),
                    MaterialTheme.colorScheme.surfaceContainerHigh,
                ),
            ) else Brush.verticalGradient(
                listOf(
                    MaterialTheme.colorScheme.surface,
                    MaterialTheme.colorScheme.surface,
                ),
            ),
        )
        .border(
            BorderStroke(1.dp, if (hero) accent.border else MaterialTheme.colorScheme.outlineVariant),
            CardShape,
        )

    val clickable = if (onClick != null) {
        base.pressable(enabled = true, interaction = interaction) {
            haptics.tick(); onClick()
        }
    } else base

    Column(modifier = modifier.then(clickable).padding(contentPadding), content = content)
}

/** "Eyebrow": etiqueta corta en mayúsculas sobre un título. Usa el acento. */
@Composable
fun Eyebrow(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = LocalAstrimAccent.current.base,
) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = color,
        modifier = modifier,
    )
}

/** Chip informativo compacto (grupo muscular, equipo, nivel...). */
@Composable
fun InfoChip(text: String, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(50)
    Box(
        modifier = modifier
            .clip(shape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), shape)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
