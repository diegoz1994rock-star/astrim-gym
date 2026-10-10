package com.astrimgym.cliente.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Radios ASTRIM: tarjetas 20–24 dp, botones 18 dp, campos 14 dp, chips
 * redondos. Un solo lugar; los componentes leen de acá.
 */
object Radii {
    val card = RoundedCornerShape(22.dp)
    val cardSmall = RoundedCornerShape(18.dp)
    val button = RoundedCornerShape(18.dp)
    val field = RoundedCornerShape(14.dp)
    val tile = RoundedCornerShape(12.dp)
    val pill = RoundedCornerShape(50)
}

val AstrimShapes = Shapes(
    extraSmall = RoundedCornerShape(10.dp),
    small = RoundedCornerShape(14.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
)
