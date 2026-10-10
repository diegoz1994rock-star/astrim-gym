package com.astrimgym.cliente.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * ASTRIM GYM PERFORMANCE — paleta oficial. Un solo lugar para todos los
 * colores de la app: ninguna pantalla define Color(0x...) a mano.
 *
 * Reglas de uso:
 *  - Los tonos oscuros y el espacio negativo dominan.
 *  - El lima es la firma de ASTRIM: acción principal, progreso activo,
 *    selección y datos clave. Nunca para decorar todo.
 *  - Verde = éxito/finalización. Rojo = error/atención. Azul = información.
 */

// --- Superficies (de más al fondo a más elevado) ---
val Ink            = Color(0xFF090A0C) // fondo principal
val SurfaceCard    = Color(0xFF111317) // superficie principal (tarjetas)
val SurfaceCardMid = Color(0xFF171A1F) // superficie secundaria (campos, steppers)
val SurfaceCardHi  = Color(0xFF1D2127) // superficie elevada (hero, botones secundarios)
val SurfacePressed = Color(0xFF242930) // feedback de pulsación / deshabilitado

// --- Líneas ---
val Hairline       = Color(0xFF292E35) // borde discreto
val HairlineSoft   = Color(0xFF1E2228) // separadores internos

// --- Texto ---
val TextPrimary    = Color(0xFFF5F6F7)
val TextSecondary  = Color(0xFFA0A6B0)
val TextTertiary   = Color(0xFF737B87)

// --- Acento ASTRIM (lima) ---
val Lime           = Color(0xFFD9E66C)
val LimeBright     = Color(0xFFF0F58B)
val LimeDeep       = Color(0xFFA9B544)
/** Texto/íconos sobre relleno lima. */
val OnLime         = Color(0xFF14160A)

// --- Semánticos ---
val Positive       = Color(0xFF62D994) // éxito / completado
val Danger         = Color(0xFFFF666D) // error / alerta
val Info           = Color(0xFF70B7FF) // información complementaria
val Warning        = Color(0xFFF2B95C) // vence pronto, avisos suaves

/** Fondo de las capas modales (pausa, confirmaciones). */
val Scrim          = Color(0xFA090A0C)

/** El acento por defecto de la app. Fijo: la identidad es ASTRIM. */
val DefaultAccent  = Lime

// Compat: nombres usados en algún punto del árbol.
val ClassBlue = Info
