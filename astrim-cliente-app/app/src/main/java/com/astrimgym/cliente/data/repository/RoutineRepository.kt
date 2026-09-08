package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.ExerciseDoc
import com.astrimgym.cliente.data.model.ExerciseVideoDoc
import com.astrimgym.cliente.data.model.RoutineAssignmentDoc
import com.astrimgym.cliente.data.model.RoutineDoc
import com.astrimgym.cliente.data.model.RoutineExerciseDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/** Una rutina asignada, ya emparejada con el id de su asignación. */
data class AssignedRoutine(
    val assignmentId: String,
    val routineId: String,
    val name: String,
    val exerciseCount: Int,
    val status: String,
    val startDate: String?,
    val endDate: String?,
)

data class RoutineDetail(
    val routine: RoutineDoc,
    val exercises: List<RoutineExerciseDoc>,
)

/**
 * Lee las rutinas del cliente desde Firestore. Solo lectura (esta fase).
 * Las escribe el panel vía su outbox.
 *
 * Lecturas: routineAssignments del cliente (pocas) para la lista;
 * routine (1) + routineExercises filtrados por routineId para el detalle;
 * exercise (1) para la ficha. El cache de Firestore cubre relecturas y
 * offline.
 */
class RoutineRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    suspend fun listAssignedRoutines(): Result<List<AssignedRoutine>> = runCatching {
        val s = session.require()
        db.collection("clients").document(s.clientId)
            .collection("routineAssignments").get().await()
            .documents.mapNotNull { doc ->
                val d = doc.toObject(RoutineAssignmentDoc::class.java) ?: return@mapNotNull null
                val routineId = d.routineId ?: return@mapNotNull null
                AssignedRoutine(
                    assignmentId = doc.id,
                    routineId = routineId,
                    name = d.routineName ?: "Rutina",
                    exerciseCount = (d.exerciseCount ?: 0L).toInt(),
                    status = d.routineStatus ?: "ACTIVE",
                    startDate = d.startDate,
                    endDate = d.endDate,
                )
            }
            .sortedWith(compareByDescending<AssignedRoutine> { it.status == "ACTIVE" }
                .thenByDescending { it.startDate.orEmpty() })
    }

    suspend fun getRoutineDetail(routineId: String): Result<RoutineDetail> = runCatching {
        val s = session.require()
        val routine = db.collection("gyms").document(s.gymId)
            .collection("routines").document(routineId).get().await()
            .toObject(RoutineDoc::class.java)
            ?: throw NoSuchElementException("No encontramos esta rutina. Puede que tu entrenador la haya quitado.")

        val exercises = db.collection("gyms").document(s.gymId)
            .collection("routineExercises")
            .whereEqualTo("routineId", routineId)
            .get().await()
            .documents.mapNotNull { it.toObject(RoutineExerciseDoc::class.java) }
            .sortedBy { it.sortOrder ?: 0L }

        RoutineDetail(routine = routine, exercises = exercises)
    }

    /**
     * Ficha del ejercicio: primero el catálogo del gimnasio, luego la
     * biblioteca global. El video NO viene del catálogo (que es compartido):
     * cada gimnasio pone el suyo en gyms/{gymId}/exerciseVideos/{exerciseId}
     * y ese se superpone acá.
     */
    suspend fun getExercise(exerciseId: String): Result<ExerciseDoc> = runCatching {
        val s = session.require()
        val own = db.collection("gyms").document(s.gymId)
            .collection("exercises").document(exerciseId).get().await()
        val base = if (own.exists()) {
            own.toObject(ExerciseDoc::class.java)!!
        } else {
            db.collection("exerciseLibrary").document(exerciseId).get().await()
                .toObject(ExerciseDoc::class.java)
                ?: throw NoSuchElementException("No hay información de este ejercicio todavía.")
        }

        val gymVideo = db.collection("gyms").document(s.gymId)
            .collection("exerciseVideos").document(exerciseId).get().await()
            .toObject(ExerciseVideoDoc::class.java)?.videoUrl

        base.copy(videoPath = gymVideo)
    }
}
