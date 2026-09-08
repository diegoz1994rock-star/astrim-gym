package com.astrimgym.cliente.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.dp

/**
 * El color de acento es lo único que varía por gimnasio (gyms.brandColor).
 * Todo lo demás (fondo charcoal, superficies, tipografía, radios) es fijo —
 * la identidad de marca vive en el acento y el logo, nunca en cambiar la
 * base premium/oscura.
 *
 * Escala de espaciado de la app (usar siempre estos valores):
 * 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40
 */
object Spacing {
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 20.dp
    val xxl = 24.dp
    val xxxl = 32.dp
    val huge = 40.dp
}

/** Colores derivados del acento que las pantallas consumen por nombre. */
data class AstrimAccent(
    val base: Color,
    /** Texto/íconos sobre un relleno sólido del acento. */
    val onAccent: Color,
    /** Relleno translúcido para fondos de chips, badges, halos. */
    val soft: Color,
    /** Borde translúcido a juego con [soft]. */
    val border: Color,
    /** Glow para el botón principal / anillos. */
    val glow: Color,
)

val LocalAstrimAccent = staticCompositionLocalOf {
    accentPalette(DefaultAccent)
}

private fun accentPalette(accent: Color): AstrimAccent = AstrimAccent(
    base = accent,
    onAccent = if (accent.luminance() > 0.6f) Color(0xFF07130C) else Color(0xFF06210F),
    soft = accent.copy(alpha = 0.14f),
    border = accent.copy(alpha = 0.30f),
    glow = accent.copy(alpha = 0.55f),
)

@Composable
fun AstrimTheme(
    accentColor: Color = DefaultAccent,
    content: @Composable () -> Unit,
) {
    val accent = accentPalette(accentColor)

    val colorScheme = darkColorScheme(
        primary = accentColor,
        onPrimary = accent.onAccent,
        primaryContainer = accent.soft,
        onPrimaryContainer = accentColor,
        secondary = TextSecondary,
        background = Ink,
        onBackground = TextPrimary,
        surface = SurfaceCard,
        onSurface = TextPrimary,
        surfaceVariant = SurfaceCardHi,
        onSurfaceVariant = TextSecondary,
        surfaceContainer = SurfaceCard,
        surfaceContainerHigh = SurfaceCardHi,
        outline = HairlineStrong,
        outlineVariant = HairlineSoft,
        error = Danger,
        onError = Color(0xFF1A0405),
        tertiary = Warning,
        scrim = Color(0xE6070809),
    )

    CompositionLocalProvider(LocalAstrimAccent provides accent) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = AstrimTypography,
            shapes = AstrimShapes,
            content = content,
        )
    }
}
