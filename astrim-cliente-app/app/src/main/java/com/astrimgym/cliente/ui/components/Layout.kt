package com.astrimgym.cliente.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.ui.theme.TextSecondary

/** Espacio libre al pie de las tabs para que la barra inferior no tape contenido. */
val BottomBarSpace = 104.dp

/**
 * Cabecera de pantalla.
 *  - Sin `onBack` (tabs): título grande de sección + subtítulo opcional.
 *  - Con `onBack` (detalle): botón atrás circular de 48 dp + título compacto.
 */
@Composable
fun ScreenHeader(
    title: String,
    onBack: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(
                start = if (onBack != null) 12.dp else 20.dp,
                end = 16.dp,
                top = if (onBack != null) 8.dp else 16.dp,
                bottom = if (onBack != null) 8.dp else 12.dp,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            AstrimIconButton(
                Icons.AutoMirrored.Rounded.ArrowBack,
                contentDescription = "Volver",
                onClick = onBack,
                sound = null,
            )
            Spacer(Modifier.width(12.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(
                title,
                style = if (onBack != null) MaterialTheme.typography.headlineSmall
                else MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = if (onBack != null) 1 else 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.semantics { heading() },
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (trailing != null) {
            Spacer(Modifier.width(8.dp))
            trailing()
        }
    }
}
