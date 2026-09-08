package com.astrimgym.cliente.ui.routine

import com.astrimgym.cliente.data.model.RoutineExerciseDoc

/**
 * Texto corto de la configuración de un ejercicio dentro de una rutina.
 * Fuerza: "4 series × 10 reps". Cardio: "20 min · 8 km/h · 3%". Solo se
 * muestran los campos que el entrenador cargó.
 */
fun RoutineExerciseDoc.summaryLine(): String {
    val parts = mutableListOf<String>()

    val sets = sets?.toInt()
    val reps = reps?.toInt()
    if (sets != null && reps != null) parts += "$sets series × $reps reps"
    else if (sets != null) parts += "$sets series"
    else if (reps != null) parts += "$reps reps"

    timeValue?.let { t ->
        val unit = when (timeUnit) {
            "SECONDS", "s" -> "s"
            "MINUTES", "min" -> "min"
            else -> timeUnit ?: "min"
        }
        parts += "${trimNumber(t)} $unit"
    }
    speedKmh?.let { parts += "${trimNumber(it)} km/h" }
    inclinePercent?.let { parts += "${trimNumber(it)}% inclinación" }
    resistanceLevel?.let { parts += "Resistencia $it" }
    rpm?.let { parts += "$it rpm" }
    intensityLabel?.takeIf { it.isNotBlank() }?.let { parts += it }

    return parts.joinToString(" · ").ifBlank { "Sin configuración" }
}

fun RoutineExerciseDoc.weightLine(): String? {
    val w = weight ?: return null
    return "${trimNumber(w)} kg"
}

fun RoutineExerciseDoc.restLine(): String? {
    val r = restSeconds?.toInt() ?: return null
    return if (r >= 60 && r % 60 == 0) "${r / 60} min" else "$r s"
}

private fun trimNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else value.toString()
