package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.MeasurementDoc
import com.astrimgym.cliente.data.model.WorkoutSessionDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.IsoFields

/** Una sesión de entrenamiento completada (la escribe esta app). */
data class WorkoutSummary(
    val date: LocalDate,
    val routineName: String,
    val durationSeconds: Long,
    val totalSets: Int,
    val totalVolume: Double,
)

/** Peso corporal en una fecha (de clients/{id}/measurements, lo carga el gimnasio). */
data class WeightPoint(val date: LocalDate, val weight: Double)

/** Una medición completa cargada por el gimnasio (clients/{id}/measurements). */
data class MeasurementPoint(
    val date: LocalDate,
    val weight: Double?,
    val heightM: Double?,
    val waist: Double?,
    val chest: Double?,
    val arm: Double?,
    val leg: Double?,
    val calf: Double?,
    val hip: Double?,
    val bodyFat: Double?,
    val muscleMass: Double?,
    val notes: String?,
) {
    val hasAnyCircumference: Boolean
        get() = listOfNotNull(waist, chest, arm, leg, calf, hip).isNotEmpty()
}

data class ProgressData(
    val sessions: List<WorkoutSummary>,
    val weights: List<WeightPoint>,
    val measurements: List<MeasurementPoint> = emptyList(),
) {
    val hasAnything: Boolean get() = sessions.isNotEmpty() || measurements.isNotEmpty()

    val firstMeasurement: MeasurementPoint? get() = measurements.firstOrNull()
    val latestMeasurement: MeasurementPoint? get() = measurements.lastOrNull()

    /** IMC de la última medición, si hay peso y altura. */
    fun latestBmi(): Double? {
        val m = latestMeasurement ?: return null
        val w = m.weight ?: return null
        val h = m.heightM ?: return null
        if (h <= 0) return null
        return w / (h * h)
    }

    /** Entrenamientos en la semana ISO actual. */
    fun thisWeekCount(today: LocalDate = LocalDate.now()): Int {
        val week = today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        val year = today.get(IsoFields.WEEK_BASED_YEAR)
        return sessions.count {
            it.date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR) == week &&
                it.date.get(IsoFields.WEEK_BASED_YEAR) == year
        }
    }

    fun volumeLast30d(today: LocalDate = LocalDate.now()): Double {
        val from = today.minusDays(30)
        return sessions.filter { !it.date.isBefore(from) }.sumOf { it.totalVolume }
    }

    /** Racha de semanas ISO consecutivas (incluida la actual o la pasada) con al menos 1 entreno. */
    fun weekStreak(today: LocalDate = LocalDate.now()): Int {
        if (sessions.isEmpty()) return 0
        val weeksWithTraining = sessions.map { weekKey(it.date) }.toSet()
        var streak = 0
        var cursor = today
        // Permite que la racha "siga viva" si entrenó la semana pasada pero aún no esta.
        if (weekKey(today) !in weeksWithTraining && weekKey(today.minusWeeks(1)) in weeksWithTraining) {
            cursor = today.minusWeeks(1)
        }
        while (weekKey(cursor) in weeksWithTraining) {
            streak++
            cursor = cursor.minusWeeks(1)
        }
        return streak
    }

    /** Entrenos por semana en las últimas [weeks] semanas, de la más vieja a la más nueva. */
    fun weeklyBuckets(weeks: Int = 8, today: LocalDate = LocalDate.now()): List<WeeklyBucket> {
        return (weeks - 1 downTo 0).map { back ->
            val ref = today.minusWeeks(back.toLong())
            val key = weekKey(ref)
            val inWeek = sessions.filter { weekKey(it.date) == key }
            WeeklyBucket(
                weekStart = ref.with(java.time.DayOfWeek.MONDAY),
                sessions = inWeek.size,
                volume = inWeek.sumOf { it.totalVolume },
            )
        }
    }

    private fun weekKey(d: LocalDate) =
        d.get(IsoFields.WEEK_BASED_YEAR) * 100 + d.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
}

data class WeeklyBucket(val weekStart: LocalDate, val sessions: Int, val volume: Double)

/**
 * Progreso del cliente a partir de datos reales: las sesiones de
 * entrenamiento que la app guardó en clients/{id}/workoutSessions y, si el
 * gimnasio las cargó, las medidas de peso de clients/{id}/measurements.
 * Solo lectura, cache-first. Nunca placeholders.
 */
class ProgressRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    suspend fun loadProgress(): Result<ProgressData> = runCatching {
        val s = session.require()
        val zone = ZoneId.systemDefault()

        val sessions = db.collection("clients").document(s.clientId)
            .collection("workoutSessions").get().await()
            .documents.mapNotNull { doc ->
                val d = doc.toObject(WorkoutSessionDoc::class.java) ?: return@mapNotNull null
                val started = d.startedAt ?: return@mapNotNull null
                WorkoutSummary(
                    date = Instant.ofEpochMilli(started).atZone(zone).toLocalDate(),
                    routineName = d.routineName ?: "Entrenamiento",
                    durationSeconds = d.durationSeconds
                        ?: ((d.endedAt ?: started) - started) / 1000,
                    totalSets = (d.totalSets ?: 0L).toInt(),
                    totalVolume = d.totalVolume ?: 0.0,
                )
            }
            .sortedByDescending { it.date }

        val measurements = db.collection("clients").document(s.clientId)
            .collection("measurements").get().await()
            .documents.mapNotNull { doc ->
                val d = doc.toObject(MeasurementDoc::class.java) ?: return@mapNotNull null
                val date = parseIsoDate(d.date) ?: return@mapNotNull null
                MeasurementPoint(
                    date = date,
                    weight = d.weight,
                    heightM = d.height,
                    waist = d.waist,
                    chest = d.chest,
                    arm = d.arm,
                    leg = d.leg,
                    calf = d.calf,
                    hip = d.hip,
                    bodyFat = d.bodyFat,
                    muscleMass = d.muscleMass,
                    notes = d.notes?.takeIf { it.isNotBlank() },
                )
            }
            .sortedBy { it.date }

        val weights = measurements
            .mapNotNull { m -> m.weight?.let { WeightPoint(m.date, it) } }

        ProgressData(sessions = sessions, weights = weights, measurements = measurements)
    }.recoverCatching { e ->
        throw when (e) {
            is ClientSession.NotLinkedException -> e
            else -> Exception("No se pudo cargar tu progreso. Deslizá para reintentar.", e)
        }
    }
}
