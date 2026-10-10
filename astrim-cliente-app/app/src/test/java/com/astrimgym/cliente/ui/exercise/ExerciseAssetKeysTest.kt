package com.astrimgym.cliente.ui.exercise

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseAssetKeysTest {

    @Test fun `normaliza tildes, mayusculas, espacios y signos`() {
        assertEquals("curl_de_biceps", ExerciseAssetKeys.slugify("Curl de Bíceps"))
        assertEquals("press_banca", ExerciseAssetKeys.slugify("  Press   banca "))
        assertEquals("extension_de_triceps_polea", ExerciseAssetKeys.slugify("Extensión de tríceps (polea)"))
        assertEquals("jalon_al_pecho", ExerciseAssetKeys.slugify("Jalón al pecho"))
        assertEquals("munecas", ExerciseAssetKeys.slugify("Muñecas"))
    }

    @Test fun `genera variantes del nombre con el id primero`() {
        val keys = ExerciseAssetKeys.exerciseKeys("ex-123", "Press de banca")
        assertEquals(listOf("ex_123", "press_de_banca", "press_banca"), keys)
    }

    @Test fun `variantes sin parentesis`() {
        val keys = ExerciseAssetKeys.exerciseKeys(null, "Peso muerto (barra)")
        assertTrue("peso_muerto_barra" in keys)
        assertTrue("peso_muerto" in keys)
    }

    @Test fun `prioriza animacion del ejercicio sobre imagen y grupo`() {
        val v = ExerciseAssetKeys.resolve(
            exerciseId = null, name = "Press de banca", muscleGroup = "Pecho",
            animations = setOf("press_banca.json", "pecho.json"),
            images = setOf("press_de_banca.webp"),
        )
        assertEquals(ExerciseVisual.Animation("exercise_anim/press_banca.json"), v)
    }

    @Test fun `imagen especifica gana a la animacion del grupo muscular`() {
        val v = ExerciseAssetKeys.resolve(
            exerciseId = null, name = "Press de banca", muscleGroup = "Pecho",
            animations = setOf("pecho.json"),
            images = setOf("press_de_banca.png"),
        )
        assertEquals(ExerciseVisual.Picture("exercise_img/press_de_banca.png"), v)
    }

    @Test fun `el id estable gana a un nombre renombrado`() {
        val v = ExerciseAssetKeys.resolve(
            exerciseId = "abc", name = "Press banca plano (nuevo)", muscleGroup = null,
            animations = setOf("abc.json"),
            images = emptySet(),
        )
        assertEquals(ExerciseVisual.Animation("exercise_anim/abc.json"), v)
    }

    @Test fun `sin recursos devuelve respaldo`() {
        val v = ExerciseAssetKeys.resolve("x", "Sentadilla", "Piernas", emptySet(), emptySet())
        assertEquals(ExerciseVisual.None, v)
    }
}
