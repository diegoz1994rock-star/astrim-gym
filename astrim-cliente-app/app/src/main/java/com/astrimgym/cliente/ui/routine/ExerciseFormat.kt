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

/** true = ejercicio por tiempo (cardio/movilidad). Misma regla que WorkoutRepository. */
val RoutineExerciseDoc.isCardio: Boolean get() = timeValue != null && sets == null

/** Segundos de trabajo de una serie de fuerza para estimar duración (supuesto: ~3 s por rep, mín. 30 s). */
private const val SECONDS_PER_REP = 3
private const val MIN_SET_SECONDS = 30

/**
 * Duración estimada en minutos de una rutina, con las mismas reglas del Modo
 * Entrenamiento: descansos prescritos (o 60 s por defecto) entre series y
 * 2 min entre ejercicios. Es una estimación: se muestra siempre con "≈".
 * Devuelve null si no hay datos suficientes para estimar.
 */
fun estimateRoutineMinutes(
    exercises: List<RoutineExerciseDoc>,
    defaultRestSeconds: Int = 60,
    betweenExercisesSeconds: Int = 120,
): Int? {
    if (exercises.isEmpty()) return null
    var total = 0L
    exercises.forEachIndexed { i, e ->
        if (e.isCardio) {
            val t = e.timeValue ?: 0.0
            total += when (e.timeUnit) {
                "HOURS", "h" -> (t * 3600).toLong()
                "SECONDS", "s" -> t.toLong()
                else -> (t * 60).toLong()
            }
        } else {
            val sets = (e.sets ?: 1L).coerceAtLeast(1L)
            val work = maxOf(MIN_SET_SECONDS.toLong(), (e.reps ?: 10L) * SECONDS_PER_REP)
            val rest = (e.restSeconds ?: defaultRestSeconds.toLong()).coerceAtLeast(0L)
            total += sets * work + (sets - 1) * rest
        }
        if (i < exercises.lastIndex) total += betweenExercisesSeconds
    }
    return ((total + 59) / 60).toInt().takeIf { it > 0 }
}

/** Total de series de fuerza de la rutina. */
fun totalStrengthSets(exercises: List<RoutineExerciseDoc>): Int =
    exercises.filterNot { it.isCardio }.sumOf { (it.sets ?: 1L).toInt().coerceAtLeast(1) }
