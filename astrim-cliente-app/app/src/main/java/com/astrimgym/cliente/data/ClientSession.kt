package com.astrimgym.cliente.data

import com.astrimgym.cliente.data.model.UserIndexDoc
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * Resuelve y cachea `userIndex/{uid}` -> { gymId, clientId } una sola vez
 * por sesión. Sin esto, cada pantalla (Inicio, Rutina, ...) volvería a
 * leer el mismo documento en cada visita — lecturas de Firestore de más.
 * Se limpia al cerrar sesión (ver MainActivity).
 */
class ClientSession(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
) {
    @Volatile
    private var cached: Resolved? = null

    data class Resolved(val uid: String, val gymId: String, val clientId: String)

    class NotLinkedException(message: String) : Exception(message)

    suspend fun require(): Resolved {
        cached?.let { return it }

        val uid = auth.currentUser?.uid
            ?: throw NotLinkedException("Tu sesión expiró. Vuelve a iniciar sesión.")

        val index = db.collection("userIndex").document(uid).get().await()
            .toObject(UserIndexDoc::class.java)
        val clientId = index?.clientId
        val gymId = index?.gymId
        if (index == null || clientId.isNullOrBlank() || gymId.isNullOrBlank()) {
            throw NotLinkedException(
                "Tu cuenta todavía no está vinculada a un cliente. Contacta a tu gimnasio.",
            )
        }

        return Resolved(uid = uid, gymId = gymId, clientId = clientId).also { cached = it }
    }

    fun clear() {
        cached = null
    }
}
