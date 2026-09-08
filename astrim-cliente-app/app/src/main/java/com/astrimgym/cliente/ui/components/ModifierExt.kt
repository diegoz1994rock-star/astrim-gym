package com.astrimgym.cliente.ui.components

import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed

/**
 * clickable con la indicación estándar de la plataforma y una
 * MutableInteractionSource propia (para leer `pressed` afuera).
 */
@Composable
fun Modifier.pressable(
    enabled: Boolean = true,
    interaction: MutableInteractionSource,
    onClick: () -> Unit,
): Modifier = this.clickable(
    interactionSource = interaction,
    indication = LocalIndication.current,
    enabled = enabled,
    onClick = onClick,
)

/** Igual, sin ripple (para superficies grandes con su propio feedback). */
fun Modifier.pressableNoRipple(
    enabled: Boolean = true,
    interaction: MutableInteractionSource,
    onClick: () -> Unit,
): Modifier = composed {
    clickable(
        interactionSource = interaction,
        indication = null,
        enabled = enabled,
        onClick = onClick,
    )
}
