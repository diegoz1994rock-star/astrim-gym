package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.ClassEnrollmentDoc
import com.astrimgym.cliente.data.model.WorkoutSessionDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Una clase a la que el cliente está inscrito, con su día/hora. */
data class AgendaClass(
    val classId: String,
    val name: String,
    val date: LocalDate,
    val startTime: String?,
)

/** Un día en que el cliente entrenó (de workoutSessions que escribe la app). */
data class AgendaWorkout(
    val date: LocalDate,
    val routineName: String,
    val durationSeconds: Long,
    val totalVolume: Double,
)

data class AgendaData(
    val classes: List<AgendaClass>,
    val workouts: List<AgendaWorkout>,
) {
    fun classesOn(day: LocalDate) = classes.filter { it.date == day }.sortedBy { it.startTime.orEmpty() }
    fun workoutsOn(day: LocalDate) = workouts.filter { it.date == day }
    /** Días con clase programada -> se marcan en azul en el calendario. */
    val classDays: Set<LocalDate> get() = classes.map { it.date }.toSet()
    /** Días entrenados -> se marcan con el color de acento. */
    val workoutDays: Set<LocalDate> get() = workouts.map { it.date }.toSet()
    fun upcomingClasses(from: LocalDate, limit: Int = 5) =
        classes.filter { !it.date.isBefore(from) }.sortedWith(compareBy({ it.date }, { it.startTime.orEmpty() })).take(limit)
}

/**
 * Agenda del cliente: clases inscritas (clients/{id}/classEnrollments, con
 * className/classDate/classStartTime denormalizados) + días entrenados
 * (clients/{id}/workoutSessions, que escribe esta misma app). Solo lectura,
 * cache-first. Nunca datos de ejemplo.
 */
class AgendaRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    suspend fun loadAgenda(): Result<AgendaData> = runCatching {
        val s = session.require()
        val zone = ZoneId.systemDefault()

        val classes = db.collection("clients").document(s.clientId)
            .collection("classEnrollments").get().await()
            .documents.mapNotNull { doc ->
                val d = doc.toObject(ClassEnrollmentDoc::class.java) ?: return@mapNotNull null
                if (d.status == "CANCELLED") return@mapNotNull null
                val date = parseIsoDate(d.classDate) ?: return@mapNotNull null
                AgendaClass(
                    classId = d.classId ?: doc.id,
                    name = d.className ?: "Clase",
                    date = date,
                    startTime = d.classStartTime?.takeIf { it.isNotBlank() },
                )
            }

        val workouts = db.collection("clients").document(s.clientId)
            .collection("workoutSessions").get().await()
            .documents.mapNotNull { doc ->
                val d = doc.toObject(WorkoutSessionDoc::class.java) ?: return@mapNotNull null
                val started = d.startedAt ?: return@mapNotNull null
                AgendaWorkout(
                    date = Instant.ofEpochMilli(started).atZone(zone).toLocalDate(),
                    routineName = d.routineName ?: "Entrenamiento",
                    durationSeconds = d.durationSeconds ?: 0L,
                    totalVolume = d.totalVolume ?: 0.0,
                )
            }

        AgendaData(classes = classes, workouts = workouts)
    }.recoverCatching { e ->
        throw when (e) {
            is ClientSession.NotLinkedException -> e
            else -> Exception("No se pudo cargar tu agenda. Deslizá para reintentar.", e)
        }
    }
}

internal fun parseIsoDate(raw: String?): LocalDate? {
    val v = raw?.trim()?.take(10) ?: return null
    return runCatching { LocalDate.parse(v) }.getOrNull()
}
