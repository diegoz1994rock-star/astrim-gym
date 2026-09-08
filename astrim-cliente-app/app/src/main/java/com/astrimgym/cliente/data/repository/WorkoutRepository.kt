package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/** Un ejercicio tal como entra al Modo Entrenamiento. */
data class WorkoutExercise(
    val exerciseId: String,
    val name: String,
    /** true = ejercicio por tiempo (cardio/movilidad): no se registran series ni peso. */
    val isCardio: Boolean,
    val targetSets: Int,
    val targetReps: Int?,
    val targetWeight: Double?,
    /** Solo cardio: duración objetivo en segundos. */
    val targetTimeSeconds: Int?,
    /** Solo cardio: línea con resistencia / rpm / velocidad / intensidad. */
    val cardioTargets: String?,
    val restSeconds: Int,
    val notes: String?,
)

private fun trimNum(v: Double): String =
    if (v % 1.0 == 0.0) v.toInt().toString() else v.toString()

/** Una serie registrada por el cliente durante el entrenamiento. */
data class CompletedSet(
    val exerciseId: String,
    val exerciseName: String,
    val setNumber: Int,
    val weight: Double?,
    val reps: Int?,
)

/**
 * Carga los ejercicios de una rutina para entrenarla y guarda la sesión
 * terminada en Firestore (`clients/{id}/workoutSessions/{auto}` + subcolección
 * `sets`). Las reglas permiten esta escritura solo al propio cliente.
 * La persistencia offline de Firestore encola la escritura si no hay red.
 */
class WorkoutRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
    private val routineRepository: RoutineRepository,
) {
    companion object {
        const val DEFAULT_REST_SECONDS = 60
        const val BETWEEN_EXERCISES_SECONDS = 120
    }

    suspend fun loadExercises(routineId: String): Result<Pair<String, List<WorkoutExercise>>> = runCatching {
        val detail = routineRepository.getRoutineDetail(routineId).getOrThrow()
        val exercises = detail.exercises.mapNotNull { e ->
            val id = e.exerciseId ?: return@mapNotNull null
            // Cardio/tiempo: el panel deja `timeValue` y limpia series/reps/peso.
            val isCardio = e.timeValue != null && e.sets == null
            val timeSeconds = e.timeValue?.let { t ->
                when (e.timeUnit) {
                    "HOURS", "h" -> (t * 3600).toInt()
                    "SECONDS", "s" -> t.toInt()
                    else -> (t * 60).toInt() // MINUTES por defecto
                }
            }
            val cardioTargets = buildList {
                e.speedKmh?.let { add("${trimNum(it)} km/h") }
                e.inclinePercent?.let { add("${trimNum(it)}% inclinación") }
                e.resistanceLevel?.let { add("Resistencia $it") }
                e.rpm?.let { add("$it rpm") }
                e.intensityLabel?.takeIf { it.isNotBlank() }?.let { add(it) }
            }.joinToString("  ·  ").ifBlank { null }
            WorkoutExercise(
                exerciseId = id,
                name = e.exerciseName ?: "Ejercicio",
                isCardio = isCardio,
                targetSets = if (isCardio) 1 else (e.sets ?: 1L).toInt().coerceAtLeast(1),
                targetReps = e.reps?.toInt(),
                targetWeight = e.weight,
                targetTimeSeconds = if (isCardio) timeSeconds else null,
                cardioTargets = if (isCardio) cardioTargets else null,
                restSeconds = (e.restSeconds ?: DEFAULT_REST_SECONDS.toLong()).toInt().coerceAtLeast(0),
                notes = e.notes,
            )
        }
        if (exercises.isEmpty()) throw NoSuchElementException("Esta rutina no tiene ejercicios cargados.")
        (detail.routine.name ?: "Entrenamiento") to exercises
    }

    suspend fun saveSession(
        routineId: String,
        routineName: String,
        startedAtMillis: Long,
        endedAtMillis: Long,
        sets: List<CompletedSet>,
    ): Result<Unit> = runCatching {
        val s = session.require()
        val totalVolume = sets.sumOf { (it.weight ?: 0.0) * (it.reps ?: 0) }

        val sessionRef = db.collection("clients").document(s.clientId)
            .collection("workoutSessions").document()

        val batch = db.batch()
        batch.set(
            sessionRef,
            mapOf(
                "gymId" to s.gymId,
                "clientId" to s.clientId,
                "routineId" to routineId,
                "routineName" to routineName,
                "startedAt" to startedAtMillis,
                "endedAt" to endedAtMillis,
                "durationSeconds" to ((endedAtMillis - startedAtMillis) / 1000),
                "status" to "COMPLETED",
                "totalSets" to sets.size,
                "totalVolume" to totalVolume,
            ),
        )
        sets.forEach { set ->
            batch.set(
                sessionRef.collection("sets").document(),
                mapOf(
                    "exerciseId" to set.exerciseId,
                    "exerciseName" to set.exerciseName,
                    "setNumber" to set.setNumber,
                    "weight" to set.weight,
                    "reps" to set.reps,
                ),
            )
        }
        batch.commit().await()
    }
}
