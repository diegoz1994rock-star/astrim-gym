package com.astrimgym.cliente.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.ExperimentalTextApi
import com.astrimgym.cliente.R

/**
 * Sistema tipográfico de la app. Dos familias, ambas variables y
 * empaquetadas en res/font (sin dependencias):
 *
 *  - Space Grotesk → títulos (nombre de ejercicio, de rutina, encabezados).
 *    Da el carácter técnico/deportivo.
 *  - Inter → cuerpo, etiquetas y TODOS los números grandes (cronómetros,
 *    peso, métricas) con cifras tabulares.
 *
 * Nada de tipografía manuscrita en ningún lado.
 */

@OptIn(ExperimentalTextApi::class)
private fun grotesk(weight: FontWeight) = Font(
    R.font.space_grotesk,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

@OptIn(ExperimentalTextApi::class)
private fun inter(weight: FontWeight) = Font(
    R.font.inter,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

val SpaceGrotesk = FontFamily(
    grotesk(FontWeight.Normal),
    grotesk(FontWeight.Medium),
    grotesk(FontWeight.SemiBold),
    grotesk(FontWeight.Bold),
)

val Inter = FontFamily(
    inter(FontWeight.Normal),
    inter(FontWeight.Medium),
    inter(FontWeight.SemiBold),
    inter(FontWeight.Bold),
)

/** Cifras tabulares: los cronómetros y métricas no "bailan" al cambiar. */
private const val TNUM = "tnum"

private val evenLineHeight = LineHeightStyle(
    alignment = LineHeightStyle.Alignment.Center,
    trim = LineHeightStyle.Trim.None,
)

val AstrimTypography = Typography(
    // Display / números protagonistas (cronómetros, peso, métricas): Inter con
    // cifras tabulares. No Space Grotesk: es variable con instancia por
    // defecto "Light" y en algunos equipos el peso Bold no se aplicaba y los
    // cronómetros salían finos (visto en el emulador 2026-10-09).
    displayLarge = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Bold,
        fontSize = 64.sp, lineHeight = 68.sp, letterSpacing = (-2).sp,
        lineHeightStyle = evenLineHeight, fontFeatureSettings = TNUM,
    ),
    displayMedium = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Bold,
        fontSize = 50.sp, lineHeight = 54.sp, letterSpacing = (-1.5).sp,
        lineHeightStyle = evenLineHeight, fontFeatureSettings = TNUM,
    ),
    displaySmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Bold,
        fontSize = 34.sp, lineHeight = 40.sp, letterSpacing = (-0.8).sp,
        lineHeightStyle = evenLineHeight, fontFeatureSettings = TNUM,
    ),
    // Headline (Space Grotesk)
    headlineLarge = TextStyle(
        fontFamily = SpaceGrotesk, fontWeight = FontWeight.SemiBold,
        fontSize = 30.sp, lineHeight = 36.sp, letterSpacing = (-0.4).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = SpaceGrotesk, fontWeight = FontWeight.SemiBold,
        fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = (-0.3).sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = SpaceGrotesk, fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp, lineHeight = 28.sp, letterSpacing = (-0.2).sp,
    ),
    // Title (Inter)
    titleLarge = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp, lineHeight = 24.sp, letterSpacing = (-0.1).sp,
    ),
    titleMedium = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp, lineHeight = 22.sp, letterSpacing = 0.sp,
        fontFeatureSettings = TNUM,
    ),
    titleSmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp, lineHeight = 20.sp, letterSpacing = 0.1.sp,
        fontFeatureSettings = TNUM,
    ),
    // Body (Inter)
    bodyLarge = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Normal,
        fontSize = 16.sp, lineHeight = 24.sp, letterSpacing = 0.1.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Normal,
        fontSize = 14.sp, lineHeight = 21.sp, letterSpacing = 0.1.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Normal,
        fontSize = 12.sp, lineHeight = 17.sp, letterSpacing = 0.2.sp,
    ),
    // Label (Inter) — chips, botones, eyebrows en mayúsculas
    labelLarge = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp, lineHeight = 18.sp, letterSpacing = 0.3.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 1.2.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Medium,
        fontSize = 11.sp, lineHeight = 14.sp, letterSpacing = 1.0.sp,
    ),
)
