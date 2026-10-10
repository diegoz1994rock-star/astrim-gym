package com.astrimgym.cliente.ui.theme

import android.provider.Settings
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

/**
 * Identidad ASTRIM GYM PERFORMANCE: base oscura + acento lima, fijo para
 * todos los gimnasios (decisión 2026-10-09: `gyms.brandColor` ya no tiñe la
 * app; el dato se conserva en Firestore por si se reactiva).
 *
 * Escala de espaciado (múltiplos de 4): 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40
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

/** Duraciones de movimiento de la app (ms). Un solo lugar para ajustarlas. */
object Motion {
    const val PRESS = 110
    const val CONFIRM = 200
    const val CARD = 220
    const val SCREEN = 240
    const val PHASE = 260
    const val PROGRESS = 450
}

/** Colores derivados del acento que las pantallas consumen por nombre. */
data class AstrimAccent(
    val base: Color,
    val bright: Color,
    val deep: Color,
    /** Texto/íconos sobre un relleno sólido del acento. */
    val onAccent: Color,
    /** Relleno translúcido para chips, badges y estados seleccionados. */
    val soft: Color,
    /** Borde translúcido a juego con [soft]. */
    val border: Color,
)

private val AstrimLime = AstrimAccent(
    base = Lime,
    bright = LimeBright,
    deep = LimeDeep,
    onAccent = OnLime,
    soft = Lime.copy(alpha = 0.12f),
    border = Lime.copy(alpha = 0.32f),
)

val LocalAstrimAccent = staticCompositionLocalOf { AstrimLime }

/**
 * true cuando el sistema pidió quitar animaciones (Opciones de desarrollador
 * o Accesibilidad → "Quitar animaciones"). Las animaciones permanentes y
 * decorativas se apagan; las de estado (progreso, fundidos) se mantienen
 * porque el propio sistema ya las acorta.
 */
val LocalReducedMotion = staticCompositionLocalOf { false }

@Composable
fun AstrimTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val reducedMotion = remember {
        runCatching {
            Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
        }.getOrDefault(false)
    }

    val colorScheme = darkColorScheme(
        primary = Lime,
        onPrimary = OnLime,
        primaryContainer = AstrimLime.soft,
        onPrimaryContainer = Lime,
        secondary = TextSecondary,
        background = Ink,
        onBackground = TextPrimary,
        surface = SurfaceCard,
        onSurface = TextPrimary,
        surfaceVariant = SurfaceCardHi,
        onSurfaceVariant = TextSecondary,
        surfaceContainerLow = SurfaceCard,
        surfaceContainer = SurfaceCardMid,
        surfaceContainerHigh = SurfaceCardHi,
        outline = Hairline,
        outlineVariant = HairlineSoft,
        error = Danger,
        onError = Color(0xFF1A0405),
        tertiary = Warning,
        scrim = Scrim,
    )

    CompositionLocalProvider(
        LocalAstrimAccent provides AstrimLime,
        LocalReducedMotion provides reducedMotion,
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = AstrimTypography,
            shapes = AstrimShapes,
            content = content,
        )
    }
}
