package com.astrimgym.cliente.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File

/**
 * Foto de perfil del cliente. Vive SOLO en el celular (almacenamiento
 * privado de la app) — nunca se sube a Firebase, según lo pedido. Si el
 * usuario borra la app o cambia de celular, se pierde; es su foto local.
 *
 * La foto pertenece a un único usuario: se guarda junto al `uid` de Firebase
 * de quien la eligió. Si en el mismo celular inicia sesión otra persona, la
 * foto anterior se borra automáticamente — nunca se muestra la foto de un
 * cliente en el perfil de otro.
 */
object LocalProfilePhoto {
    private const val FILE_NAME = "profile_photo.jpg"
    private const val OWNER_FILE_NAME = "profile_photo.owner"
    private const val MAX_SIZE = 512

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)
    private fun ownerFile(context: Context): File = File(context.filesDir, OWNER_FILE_NAME)

    private fun currentOwner(context: Context): String? =
        runCatching { ownerFile(context).readText() }.getOrNull()

    /** Borra la foto si el dueño guardado no es [ownerId] (o si no hay dueño válido). */
    private fun ensureOwner(context: Context, ownerId: String) {
        if (ownerId.isBlank() || currentOwner(context) != ownerId) clear(context)
    }

    /** Copia y reescala la imagen elegida en la galería. Devuelve true si quedó guardada. */
    fun saveFromUri(context: Context, uri: Uri, ownerId: String): Boolean {
        if (ownerId.isBlank()) return false
        return try {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return false
            val src = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return false
            val scale = MAX_SIZE.toFloat() / maxOf(src.width, src.height).coerceAtLeast(1)
            val scaled = if (scale < 1f) {
                Bitmap.createScaledBitmap(src, (src.width * scale).toInt(), (src.height * scale).toInt(), true)
            } else {
                src
            }
            file(context).outputStream().use { scaled.compress(Bitmap.CompressFormat.JPEG, 88, it) }
            ownerFile(context).writeText(ownerId)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun load(context: Context, ownerId: String): Bitmap? {
        ensureOwner(context, ownerId)
        return if (file(context).exists()) {
            runCatching { BitmapFactory.decodeFile(file(context).absolutePath) }.getOrNull()
        } else {
            null
        }
    }

    fun clear(context: Context) {
        runCatching { file(context).delete() }
        runCatching { ownerFile(context).delete() }
    }
}
