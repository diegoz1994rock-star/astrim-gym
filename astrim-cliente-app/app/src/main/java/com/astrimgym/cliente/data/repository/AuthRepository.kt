package com.astrimgym.cliente.data.repository

import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await

/**
 * Login de clientes contra Firebase Auth (email/contraseña). No decide
 * localmente si las credenciales son válidas: el error de Firebase es la
 * única fuente de verdad. La sesión la persiste el SDK de Firebase
 * (no hay SessionManager ni manejo manual de tokens).
 */
class AuthRepository(private val auth: FirebaseAuth) {

    val isLoggedIn: Boolean get() = auth.currentUser != null

    val uid: String? get() = auth.currentUser?.uid

    suspend fun login(email: String, password: String): Result<Unit> {
        return try {
            auth.signInWithEmailAndPassword(email.trim(), password).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception(friendlyMessage(e), e))
        }
    }

    fun logout() = auth.signOut()

    private fun friendlyMessage(e: Exception): String {
        val msg = e.message.orEmpty()
        return when {
            msg.contains("password is invalid", ignoreCase = true) ||
                msg.contains("no user record", ignoreCase = true) ||
                msg.contains("INVALID_LOGIN_CREDENTIALS", ignoreCase = true) ->
                "Correo o contraseña incorrectos."
            msg.contains("network", ignoreCase = true) ->
                "No se pudo conectar. Revisa tu conexión a internet."
            msg.contains("blocked", ignoreCase = true) ->
                "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
            else -> "No se pudo iniciar sesión."
        }
    }
}
