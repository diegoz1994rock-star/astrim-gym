package com.astrimgym.cliente.ui.exercise

import java.text.Normalizer
import java.util.Locale

/**
 * Normalización de nombres de ejercicio a claves de archivo, sin depender de
 * Android (se prueba en JVM). Ejemplos:
 *
 *   "Press de banca"   → press_de_banca, press_banca
 *   "Curl de Bíceps"   → curl_de_biceps, curl_biceps
 *   "Peso muerto (barra)" → peso_muerto_barra, peso_muerto
 *
 * Orden de búsqueda (de más específico a más genérico):
 *   1. id estable del ejercicio (no cambia si el gimnasio renombra)
 *   2. nombre completo normalizado
 *   3. nombre sin conectores ("de", "con", "al"...)
 *   4. nombre sin lo que va entre paréntesis
 *   5. grupo muscular (recurso compartido entre ejercicios)
 */
object ExerciseAssetKeys {

    private val STOPWORDS = setOf("de", "del", "con", "en", "la", "el", "los", "las", "al", "a", "y", "para", "por")

    fun slugify(raw: String): String {
        val noAccents = Normalizer.normalize(raw.trim().lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")
            .replace('ñ', 'n')
        return noAccents
            .replace(Regex("[^a-z0-9]+"), "_")
            .trim('_')
    }

    /** Claves específicas del ejercicio (id + variantes del nombre), sin duplicados. */
    fun exerciseKeys(exerciseId: String?, name: String?): List<String> {
        val out = LinkedHashSet<String>()
        exerciseId?.takeIf { it.isNotBlank() }?.let { slugify(it).takeIf(String::isNotEmpty)?.let(out::add) }
        if (!name.isNullOrBlank()) {
            val full = slugify(name)
            if (full.isNotEmpty()) out += full
            val noStop = full.split('_').filter { it.isNotEmpty() && it !in STOPWORDS }.joinToString("_")
            if (noStop.isNotEmpty()) out += noStop
            val noParens = slugify(name.replace(Regex("\\(.*?\\)"), " "))
            if (noParens.isNotEmpty()) {
                out += noParens
                val noParensStop = noParens.split('_').filter { it !in STOPWORDS }.joinToString("_")
                if (noParensStop.isNotEmpty()) out += noParensStop
            }
        }
        return out.toList()
    }

    /** Clave genérica por grupo muscular, si hay. */
    fun groupKey(muscleGroup: String?): String? =
        muscleGroup?.takeIf { it.isNotBlank() }?.let(::slugify)?.takeIf { it.isNotEmpty() }

    /**
     * Elige el recurso local según la prioridad documentada: primero lo
     * específico del ejercicio (animación, luego imagen), después lo del grupo
     * muscular. `available` = nombres de archivo presentes (con extensión).
     */
    fun resolve(
        exerciseId: String?,
        name: String?,
        muscleGroup: String?,
        animations: Set<String>,
        images: Set<String>,
    ): ExerciseVisual {
        fun find(keys: List<String>): ExerciseVisual? {
            keys.forEach { k -> if ("$k.json" in animations) return ExerciseVisual.Animation("$ANIM_DIR/$k.json") }
            keys.forEach { k ->
                IMAGE_EXTS.forEach { ext -> if ("$k.$ext" in images) return ExerciseVisual.Picture("$IMG_DIR/$k.$ext") }
            }
            return null
        }
        return find(exerciseKeys(exerciseId, name))
            ?: groupKey(muscleGroup)?.let { find(listOf(it)) }
            ?: ExerciseVisual.None
    }

    const val ANIM_DIR = "exercise_anim"
    const val IMG_DIR = "exercise_img"
    val IMAGE_EXTS = listOf("webp", "png", "jpg")
}

/** Recurso visual local resuelto para un ejercicio. */
sealed interface ExerciseVisual {
    data class Animation(val assetPath: String) : ExerciseVisual
    data class Picture(val assetPath: String) : ExerciseVisual
    data object None : ExerciseVisual
}
