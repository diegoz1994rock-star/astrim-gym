package com.astrimgym.cliente.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Paleta base oscura/premium, fija (no depende del gimnasio). Un solo lugar
 * para todos los colores de la app — ninguna pantalla define Color(...) a
 * mano. La identidad de cada gimnasio vive solo en el acento (gyms.brandColor)
 * y su logo; el resto de la base es siempre esta.
 */

// --- Superficies (de más al fondo a más elevado) ---
val Ink            = Color(0xFF0A0B0D) // fondo de la app (negro/charcoal)
val InkRaised      = Color(0xFF0F1013) // fondo de zonas inmersivas
val SurfaceCard    = Color(0xFF15171B) // tarjeta estándar
val SurfaceCardHi  = Color(0xFF1D2025) // tarjeta elevada / hero
val SurfaceInput   = Color(0xFF1A1C21) // campos de texto, steppers
val SurfacePressed = Color(0xFF262A31) // feedback de pulsación

// --- Líneas ---
val HairlineSoft   = Color(0x14FFFFFF) // 8% blanco — bordes sutiles
val HairlineStrong = Color(0x24FFFFFF) // 14% blanco — bordes marcados

// --- Texto ---
val TextPrimary    = Color(0xFFF4F5F7)
val TextSecondary  = Color(0xFF9AA0A9)
val TextTertiary   = Color(0xFF666B74)

// --- Acento por defecto (verde) ---
// Se usa mientras /me todavía no cargó gyms.brandColor del gimnasio real.
val DefaultAccent  = Color(0xFF2BE07C)

// --- Semánticos ---
val Danger         = Color(0xFFFF5A63)
val Warning        = Color(0xFFF5B546)
val Positive       = Color(0xFF2BE07C)
val ClassBlue      = Color(0xFF4C8DFF) // días con clase programada en el calendario

// Compat: nombres antiguos usados en algún punto del árbol.
val SurfaceBackground = Ink
val SurfaceCardElevated = SurfaceCardHi
val Divider = HairlineStrong
