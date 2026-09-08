package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.ClientDoc
import com.astrimgym.cliente.data.model.GymDoc
import com.astrimgym.cliente.data.model.MembershipDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.temporal.ChronoUnit

enum class MembershipState { ACTIVE, EXPIRING_SOON, EXPIRED, SUSPENDED, CANCELLED, NONE }

data class MembershipView(
    val planName: String?,
    val startDate: String?,
    val endDate: String?,
    val state: MembershipState,
    val daysLeft: Long?,
)

data class ProfileData(
    val client: ClientDoc,
    val gym: GymDoc?,
    val membership: MembershipView,
)

/**
 * Datos del cliente para la pantalla Perfil. Todo de solo lectura: el
 * cliente no puede modificar sus datos (los administra el gimnasio). La
 * foto de perfil NO vive acá — es local al celular, ver LocalProfilePhoto.
 */
class ProfileRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    suspend fun load(): Result<ProfileData> = runCatching {
        val s = session.require()

        val client = db.collection("clients").document(s.clientId).get().await()
            .toObject(ClientDoc::class.java)
            ?: throw NoSuchElementException("No encontramos tu perfil.")

        val gym = db.collection("gyms").document(s.gymId).get().await()
            .toObject(GymDoc::class.java)

        val memberships = db.collection("clients").document(s.clientId)
            .collection("memberships").get().await()
            .documents.mapNotNull { it.toObject(MembershipDoc::class.java) }

        // La membresía "vigente" es la de mayor fecha de fin.
        val current = memberships.maxByOrNull { it.endDate.orEmpty() }
        ProfileData(client = client, gym = gym, membership = toView(current))
    }

    private fun toView(m: MembershipDoc?): MembershipView {
        if (m == null) return MembershipView(null, null, null, MembershipState.NONE, null)

        var daysLeft: Long? = null
        val state = when {
            m.manualStatus == "SUSPENDED" -> MembershipState.SUSPENDED
            m.manualStatus == "CANCELLED" -> MembershipState.CANCELLED
            else -> {
                val end = runCatching { LocalDate.parse(m.endDate) }.getOrNull()
                if (end == null) {
                    MembershipState.NONE
                } else {
                    daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), end)
                    when {
                        daysLeft!! < 0 -> MembershipState.EXPIRED
                        daysLeft!! <= 7 -> MembershipState.EXPIRING_SOON
                        else -> MembershipState.ACTIVE
                    }
                }
            }
        }
        return MembershipView(m.planName, m.startDate, m.endDate, state, daysLeft)
    }
}
