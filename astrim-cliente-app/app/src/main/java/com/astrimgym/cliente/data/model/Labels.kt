package com.astrimgym.cliente.data.model

/**
 * Nombres en español de los grupos musculares del catálogo. Misma tabla que
 * el panel (`src/types/exercise.ts` → MUSCLE_GROUP_LABELS). Si llega un valor
 * que no es un código conocido (texto libre), se muestra tal cual.
 */
private val MUSCLE_GROUP_LABELS = mapOf(
    "CHEST" to "Pecho",
    "BACK" to "Espalda",
    "SHOULDERS" to "Hombros",
    "BICEPS" to "Bíceps",
    "TRICEPS" to "Tríceps",
    "FOREARMS" to "Antebrazos",
    "LEGS" to "Piernas",
    "QUADRICEPS" to "Cuádriceps",
    "HAMSTRINGS" to "Femorales",
    "CALVES" to "Pantorrillas",
    "GLUTES" to "Glúteos",
    "ABS" to "Abdomen",
    "OBLIQUES" to "Oblicuos",
    "TRAPS" to "Trapecio",
    "CARDIO" to "Cardio",
    "FULL_BODY" to "Cuerpo completo",
    "OTHER" to "Otro",
)

fun muscleGroupLabel(raw: String?): String? {
    val v = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return MUSCLE_GROUP_LABELS[v.uppercase()] ?: v
}
