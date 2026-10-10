package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

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

/** Datos visuales de un ejercicio para el Modo Entrenamiento (no bloquean el entrenamiento). */
data class ExerciseMeta(
    val muscleGroup: String?,
    /** Video del gimnasio (gyms/{g}/exerciseVideos). `null` = no cargó ninguno. */
    val videoUrl: String?,
)

/** Resultado de guardar una sesión. */
enum class SaveOutcome {
    /** El servidor confirmó la escritura. */
    SYNCED,
    /**
     * Sin confirmación del servidor a tiempo (sin red): la escritura quedó en
     * la cola persistente de Firestore en este teléfono y se sube sola al
     * volver la conexión.
     */
    QUEUED,
}

/** Contrato que usa el Modo Entrenamiento (permite probar el ViewModel sin Firebase). */
interface WorkoutDataSource {
    suspend fun loadExercises(routineId: String): Result<Pair<String, List<WorkoutExercise>>>
    suspend fun loadExerciseMeta(exerciseId: String): Result<ExerciseMeta>
    suspend fun saveSession(
        routineId: String,
        routineName: String,
        startedAtMillis: Long,
        endedAtMillis: Long,
        sets: List<CompletedSet>,
    ): Result<SaveOutcome>
}

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
) : WorkoutDataSource {
    companion object {
        const val DEFAULT_REST_SECONDS = 60
        const val BETWEEN_EXERCISES_SECONDS = 120
        /** Cuánto esperar la confirmación del servidor antes de reportar "en cola". */
        private const val SYNC_WAIT_MS = 6_000L
    }

    /** 2–3 lecturas por ejercicio (catálogo + video del gym); el VM las pide de a una y las cachea. */
    override suspend fun loadExerciseMeta(exerciseId: String): Result<ExerciseMeta> =
        routineRepository.getExercise(exerciseId).map {
            ExerciseMeta(com.astrimgym.cliente.data.model.muscleGroupLabel(it.muscleGroup), it.videoPath)
        }

    override suspend fun loadExercises(routineId: String): Result<Pair<String, List<WorkoutExercise>>> = runCatching {
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

    override suspend fun saveSession(
        routineId: String,
        routineName: String,
        startedAtMillis: Long,
        endedAtMillis: Long,
        sets: List<CompletedSet>,
    ): Result<SaveOutcome> = runCatching {
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
                // Series de fuerza (con peso o reps). El cardio se guarda igual en
                // la subcolección `sets`, pero no cuenta como "serie": así el
                // historial coincide con el resumen que vio el cliente.
                "totalSets" to sets.count { it.reps != null || it.weight != null },
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
        // Con persistencia offline el batch se aplica al caché local en el
        // acto; el Task recién completa cuando el servidor confirma. Sin red
        // eso puede no pasar nunca durante esta pantalla, así que esperamos
        // un tiempo prudente y, si no llegó, informamos "en cola" (la
        // escritura NO se pierde: Firestore la reintenta sola).
        val task = batch.commit()
        val confirmed = withTimeoutOrNull(SYNC_WAIT_MS) { task.await(); true }
        if (confirmed == true) SaveOutcome.SYNCED else SaveOutcome.QUEUED
    }
}
