package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.MealLogEntryDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.time.Instant
import java.time.LocalDate

/** Un alimento que el cliente registró como consumido en una fecha/momento del día. */
data class MealLogEntry(
    val id: String,
    val mealPlanId: String,
    val date: String,
    val mealType: String,
    val foodId: String,
    val foodName: String,
    val category: String,
    val quantity: Double,
    val unit: String,
    val calories: Double,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
    val createdAt: String,
)

/**
 * Escribe y lee el registro de comidas del propio cliente en
 * `clients/{clientId}/mealLogEntries`. Mismo patrón que WorkoutRepository:
 * escritura directa a Firestore (sin SQLite, sin aprobación del panel), las
 * reglas de seguridad ya permiten create/update/delete solo al propio
 * cliente. La persistencia offline de Firestore encola la escritura si no
 * hay red.
 */
class MealLogRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    /** Todo lo registrado ese día, sin importar a qué plan pertenece — ver la variante con `mealPlanId` para filtrar por uno. */
    suspend fun entriesForDate(date: LocalDate): Result<List<MealLogEntry>> = runCatching {
        val s = session.require()
        val dateStr = date.toString() // yyyy-MM-dd (ISO-8601, formato acordado)
        db.collection("clients").document(s.clientId)
            .collection("mealLogEntries")
            .whereEqualTo("date", dateStr)
            .get().await()
            .documents.mapNotNull { doc -> toEntry(doc.id, doc.toObject(MealLogEntryDoc::class.java), dateStr) }
    }

    /** Lo registrado ese día contra UN plan puntual — la pantalla de detalle de un plan no debe mezclar comidas de otro plan. */
    suspend fun entriesForDate(date: LocalDate, mealPlanId: String): Result<List<MealLogEntry>> = runCatching {
        val s = session.require()
        val dateStr = date.toString()
        db.collection("clients").document(s.clientId)
            .collection("mealLogEntries")
            .whereEqualTo("date", dateStr)
            .whereEqualTo("mealPlanId", mealPlanId)
            .get().await()
            .documents.mapNotNull { doc -> toEntry(doc.id, doc.toObject(MealLogEntryDoc::class.java), dateStr) }
    }

    suspend fun addEntry(
        mealPlanId: String,
        date: LocalDate,
        mealType: String,
        food: AllowedFood,
        quantity: Double,
    ): Result<Unit> = runCatching {
        val s = session.require()
        val macros = computeMacros(food, quantity)
        db.collection("clients").document(s.clientId)
            .collection("mealLogEntries").document()
            .set(
                entryMap(
                    gymId = s.gymId,
                    clientId = s.clientId,
                    mealPlanId = mealPlanId,
                    date = date,
                    mealType = mealType,
                    food = food,
                    quantity = quantity,
                    macros = macros,
                    createdAt = Instant.now().toString(),
                ),
            )
            .await()
        Unit
    }

    /** Edita una entrada existente (cantidad y/o alimento/momento del día). Conserva su `createdAt` original. */
    suspend fun updateEntry(
        entryId: String,
        mealPlanId: String,
        date: LocalDate,
        mealType: String,
        food: AllowedFood,
        quantity: Double,
        createdAt: String,
    ): Result<Unit> = runCatching {
        val s = session.require()
        val macros = computeMacros(food, quantity)
        db.collection("clients").document(s.clientId)
            .collection("mealLogEntries").document(entryId)
            .set(
                entryMap(
                    gymId = s.gymId,
                    clientId = s.clientId,
                    mealPlanId = mealPlanId,
                    date = date,
                    mealType = mealType,
                    food = food,
                    quantity = quantity,
                    macros = macros,
                    createdAt = createdAt,
                ),
            )
            .await()
        Unit
    }

    suspend fun deleteEntry(entryId: String): Result<Unit> = runCatching {
        val s = session.require()
        db.collection("clients").document(s.clientId)
            .collection("mealLogEntries").document(entryId)
            .delete().await()
        Unit
    }

    private fun entryMap(
        gymId: String,
        clientId: String,
        mealPlanId: String,
        date: LocalDate,
        mealType: String,
        food: AllowedFood,
        quantity: Double,
        macros: Macros,
        createdAt: String,
    ): Map<String, Any?> = mapOf(
        "gymId" to gymId,
        "clientId" to clientId,
        "mealPlanId" to mealPlanId,
        "date" to date.toString(),
        "mealType" to mealType,
        "foodId" to food.foodId,
        "foodName" to food.name,
        "category" to food.category,
        "quantity" to quantity,
        "unit" to food.defaultUnit,
        "caloriesKcal" to macros.calories,
        "proteinG" to macros.protein,
        "carbsG" to macros.carbs,
        "fatG" to macros.fat,
        "createdAt" to createdAt,
    )

    private fun toEntry(id: String, d: MealLogEntryDoc?, fallbackDate: String): MealLogEntry? {
        if (d == null) return null
        val foodId = d.foodId ?: return null
        return MealLogEntry(
            id = id,
            mealPlanId = d.mealPlanId.orEmpty(),
            date = d.date ?: fallbackDate,
            mealType = d.mealType ?: "OTRO",
            foodId = foodId,
            foodName = d.foodName ?: "Alimento",
            category = d.category ?: "OTRO",
            quantity = d.quantity ?: 0.0,
            unit = d.unit.orEmpty(),
            calories = d.caloriesKcal ?: 0.0,
            protein = d.proteinG ?: 0.0,
            carbs = d.carbsG ?: 0.0,
            fat = d.fatG ?: 0.0,
            createdAt = d.createdAt.orEmpty(),
        )
    }
}
