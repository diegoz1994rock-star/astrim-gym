package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.ClientDoc
import com.astrimgym.cliente.data.model.GymDoc
import com.astrimgym.cliente.data.model.RoutineAssignmentDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

data class HomeData(
    val client: ClientDoc,
    val gym: GymDoc?,
    val todayRoutine: RoutineAssignmentDoc?,
)

/**
 * Datos reales de Firestore para la pantalla Inicio. Nunca placeholders.
 *
 * Lecturas: clients/{id} (1) + gyms/{id} (1) + routineAssignments del
 * cliente (pocas). El `userIndex` lo resuelve una sola vez ClientSession.
 * La persistencia offline del SDK de Firestore cubre las relecturas y el
 * modo sin conexión.
 */
class HomeRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    suspend fun loadHome(): Result<HomeData> = runCatching {
        val s = session.require()

        val client = db.collection("clients").document(s.clientId).get().await()
            .toObject(ClientDoc::class.java)
            ?: throw NoSuchElementException("No encontramos tu perfil. Intenta más tarde.")

        val gym = db.collection("gyms").document(s.gymId).get().await()
            .toObject(GymDoc::class.java)

        val assignments = db.collection("clients").document(s.clientId)
            .collection("routineAssignments").get().await()
            .documents.mapNotNull { it.toObject(RoutineAssignmentDoc::class.java) }

        val todayRoutine = assignments
            .filter { it.routineStatus == "ACTIVE" }
            .maxByOrNull { it.startDate.orEmpty() }
            ?: assignments.maxByOrNull { it.startDate.orEmpty() }

        HomeData(client = client, gym = gym, todayRoutine = todayRoutine)
    }.recoverCatching { e ->
        throw when (e) {
            is ClientSession.NotLinkedException, is NoSuchElementException -> e
            else -> Exception("No se pudo cargar tu información. Desliza para reintentar.", e)
        }
    }
}
