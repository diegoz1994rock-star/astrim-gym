package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.ClassEnrollmentDoc
import com.astrimgym.cliente.data.model.ClientDoc
import com.astrimgym.cliente.data.model.GymDoc
import com.astrimgym.cliente.data.model.MealPlanAssignmentDoc
import com.astrimgym.cliente.data.model.RoutineAssignmentDoc
import com.astrimgym.cliente.data.model.WorkoutSessionDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters

/** Un entrenamiento registrado en la semana actual (para Inicio). */
data class WeekSession(val date: LocalDate, val routineId: String?, val totalVolume: Double)

data class HomeData(
    val client: ClientDoc,
    val gym: GymDoc?,
    val todayRoutine: RoutineAssignmentDoc?,
    /** Próxima clase inscrita (hoy o después). `null` = ninguna o no se pudo leer. */
    val nextClass: AgendaClass? = null,
    /** Sesiones guardadas desde el lunes de esta semana. `null` = no se pudo leer. */
    val weekSessions: List<WeekSession>? = null,
    /** Nombre del plan de alimentación activo, si hay. */
    val activeMealPlan: String? = null,
) {
    /** true si hoy ya se registró un entrenamiento de la rutina del día. */
    val routineDoneToday: Boolean
        get() {
            val today = LocalDate.now()
            val id = todayRoutine?.routineId ?: return false
            return weekSessions.orEmpty().any { it.date == today && it.routineId == id }
        }
}

/**
 * Datos reales de Firestore para la pantalla Inicio. Nunca placeholders.
 *
 * Lecturas: clients/{id} (1) + gyms/{id} (1) + routineAssignments del
 * cliente (pocas). Secciones complementarias, cada una opcional y en
 * paralelo: classEnrollments (pocas), workoutSessions de esta semana (≤ 7
 * aprox., filtradas por `startedAt`) y mealPlanAssignments (pocas). Si una
 * falla, Inicio se muestra igual sin esa tarjeta. La persistencia offline del
 * SDK cubre relecturas y el modo sin conexión.
 */
class HomeRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    suspend fun loadHome(): Result<HomeData> = runCatching {
        val s = session.require()
        val clientRef = db.collection("clients").document(s.clientId)

        coroutineScope {
            val clientJob = async {
                clientRef.get().await().toObject(ClientDoc::class.java)
                    ?: throw NoSuchElementException("No encontramos tu perfil. Intenta más tarde.")
            }
            val gymJob = async {
                db.collection("gyms").document(s.gymId).get().await().toObject(GymDoc::class.java)
            }
            val assignmentsJob = async {
                clientRef.collection("routineAssignments").get().await()
                    .documents.mapNotNull { it.toObject(RoutineAssignmentDoc::class.java) }
            }
            val nextClassJob = async { runCatching { loadNextClass(clientRef) }.getOrNull() }
            val weekJob = async { runCatching { loadWeekSessions(clientRef) }.getOrNull() }
            val mealJob = async { runCatching { loadActiveMealPlan(clientRef) }.getOrNull() }

            val assignments = assignmentsJob.await()
            val todayRoutine = assignments
                .filter { it.routineStatus == "ACTIVE" }
                .maxByOrNull { it.startDate.orEmpty() }
                ?: assignments.maxByOrNull { it.startDate.orEmpty() }

            HomeData(
                client = clientJob.await(),
                gym = gymJob.await(),
                todayRoutine = todayRoutine,
                nextClass = nextClassJob.await(),
                weekSessions = weekJob.await(),
                activeMealPlan = mealJob.await(),
            )
        }
    }.recoverCatching { e ->
        throw when (e) {
            is ClientSession.NotLinkedException, is NoSuchElementException -> e
            else -> Exception("No se pudo cargar tu información. Revisa tu conexión e intenta de nuevo.", e)
        }
    }

    private suspend fun loadNextClass(clientRef: com.google.firebase.firestore.DocumentReference): AgendaClass? {
        val today = LocalDate.now()
        return clientRef.collection("classEnrollments").get().await()
            .documents.mapNotNull { doc ->
                val d = doc.toObject(ClassEnrollmentDoc::class.java) ?: return@mapNotNull null
                if (d.status == "CANCELLED") return@mapNotNull null
                val date = parseIsoDate(d.classDate) ?: return@mapNotNull null
                if (date.isBefore(today)) return@mapNotNull null
                AgendaClass(
                    classId = d.classId ?: doc.id,
                    name = d.className ?: "Clase",
                    date = date,
                    startTime = d.classStartTime?.takeIf { it.isNotBlank() },
                )
            }
            .minWithOrNull(compareBy({ it.date }, { it.startTime.orEmpty() }))
    }

    private suspend fun loadWeekSessions(clientRef: com.google.firebase.firestore.DocumentReference): List<WeekSession> {
        val zone = ZoneId.systemDefault()
        val monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val fromMillis = monday.atStartOfDay(zone).toInstant().toEpochMilli()
        return clientRef.collection("workoutSessions")
            .whereGreaterThanOrEqualTo("startedAt", fromMillis)
            .get().await()
            .documents.mapNotNull { doc ->
                val d = doc.toObject(WorkoutSessionDoc::class.java) ?: return@mapNotNull null
                val started = d.startedAt ?: return@mapNotNull null
                WeekSession(
                    date = Instant.ofEpochMilli(started).atZone(zone).toLocalDate(),
                    routineId = d.routineId,
                    totalVolume = d.totalVolume ?: 0.0,
                )
            }
    }

    private suspend fun loadActiveMealPlan(clientRef: com.google.firebase.firestore.DocumentReference): String? =
        clientRef.collection("mealPlanAssignments").get().await()
            .documents.mapNotNull { it.toObject(MealPlanAssignmentDoc::class.java) }
            .filter { it.mealPlanStatus == null || it.mealPlanStatus == "ACTIVE" }
            .maxByOrNull { it.startDate.orEmpty() }
            ?.mealPlanName
}
