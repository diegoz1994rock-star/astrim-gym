package com.astrimgym.cliente.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.LocalReducedMotion
import com.astrimgym.cliente.ui.theme.Motion
import com.astrimgym.cliente.ui.theme.Radii
import com.astrimgym.cliente.ui.theme.TextSecondary
import com.astrimgym.cliente.ui.theme.TextTertiary

/**
 * Control de registro (peso / repeticiones) del Modo Entrenamiento.
 * Tarjeta propia con: etiqueta, objetivo prescrito a la derecha (en gris,
 * nunca se sobrescribe), valor registrado grande con su unidad y botones
 * −/+ de 56 dp. El valor cambia con un desplazamiento corto hacia arriba o
 * abajo según el sentido.
 */
@Composable
fun AstrimStepper(
    label: String,
    value: String,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
    modifier: Modifier = Modifier,
    unit: String? = null,
    /** Objetivo del entrenador, p. ej. "Objetivo 12". `null` = sin objetivo. */
    target: String? = null,
    minusLabel: String = "Disminuir $label",
    plusLabel: String = "Aumentar $label",
) {
    val reduced = LocalReducedMotion.current
    Column(
        modifier = modifier
            .clip(Radii.cardSmall)
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline), Radii.cardSmall)
            .padding(horizontal = 12.dp, vertical = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 4.dp)) {
            Text(
                label.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = TextSecondary,
                modifier = Modifier.weight(1f),
            )
            if (target != null) {
                Text(target, style = MaterialTheme.typography.labelLarge, color = TextTertiary)
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            AstrimIconButton(
                Icons.Rounded.Remove, minusLabel, onMinus,
                size = 56.dp, tint = LocalAstrimAccent.current.base, bordered = true, sound = null,
            )
            Row(
                modifier = Modifier
                    .weight(1f)
                    .semantics { contentDescription = "$label: $value ${unit.orEmpty()}" },
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.Bottom,
            ) {
                AnimatedContent(
                    targetState = value,
                    transitionSpec = {
                        val up = (targetState.toDoubleOrNull() ?: 0.0) >= (initialState.toDoubleOrNull() ?: 0.0)
                        if (reduced) {
                            fadeIn(tween(Motion.PRESS)) togetherWith fadeOut(tween(Motion.PRESS))
                        } else {
                            (slideInVertically(tween(Motion.CONFIRM)) { if (up) it / 2 else -it / 2 } + fadeIn(tween(Motion.CONFIRM))) togetherWith
                                (slideOutVertically(tween(Motion.CONFIRM)) { if (up) -it / 2 else it / 2 } + fadeOut(tween(Motion.PRESS)))
                        }
                    },
                    label = "stepValue",
                ) { v ->
                    Text(
                        v,
                        style = MaterialTheme.typography.displaySmall,
                        color = MaterialTheme.colorScheme.onBackground,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                    )
                }
                if (unit != null) {
                    Spacer(Modifier.width(4.dp))
                    Text(
                        unit,
                        style = MaterialTheme.typography.titleMedium,
                        color = TextSecondary,
                        modifier = Modifier.padding(bottom = 6.dp),
                    )
                }
            }
            AstrimIconButton(
                Icons.Rounded.Add, plusLabel, onPlus,
                size = 56.dp, tint = LocalAstrimAccent.current.base, bordered = true, sound = null,
            )
        }
    }
}

/** Fila de ancho completo con dos steppers no cabe en pantallas chicas: se apilan. */
@Composable
fun StepperStack(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) { content() }
}
