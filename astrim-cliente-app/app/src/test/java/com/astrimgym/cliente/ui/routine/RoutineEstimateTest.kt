package com.astrimgym.cliente.ui.routine

import com.astrimgym.cliente.data.model.RoutineExerciseDoc
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RoutineEstimateTest {

    @Test fun `estima fuerza con descansos y cambio de ejercicio`() {
        // 3 series × 10 reps (30 s c/u) + 2 descansos de 60 s = 210 s
        // + cambio de ejercicio 120 s
        // + cardio 10 min = 600 s  → 930 s → 16 min (redondeo hacia arriba)
        val exercises = listOf(
            RoutineExerciseDoc(exerciseId = "a", sets = 3, reps = 10, restSeconds = 60),
            RoutineExerciseDoc(exerciseId = "b", timeValue = 10.0, timeUnit = "MINUTES"),
        )
        assertEquals(16, estimateRoutineMinutes(exercises))
        assertEquals(3, totalStrengthSets(exercises))
    }

    @Test fun `sin ejercicios no estima`() {
        assertNull(estimateRoutineMinutes(emptyList()))
    }
}
