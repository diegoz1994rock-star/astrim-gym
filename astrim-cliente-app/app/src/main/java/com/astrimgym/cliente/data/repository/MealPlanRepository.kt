package com.astrimgym.cliente.data.repository

import com.astrimgym.cliente.data.ClientSession
import com.astrimgym.cliente.data.model.FoodDoc
import com.astrimgym.cliente.data.model.MealPlanAssignmentDoc
import com.astrimgym.cliente.data.model.MealPlanCategoryTargetDoc
import com.astrimgym.cliente.data.model.MealPlanDoc
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/** Un alimento del catálogo, ya resuelto (no el doc crudo de Firestore). */
data class AllowedFood(
    val foodId: String,
    val name: String,
    val category: String,
    val defaultUnit: String,
    val caloriesKcal: Double?,
    val proteinG: Double?,
    val carbsG: Double?,
    val fatG: Double?,
    /** Porción de referencia en términos cotidianos (ej. "1 banano mediano" ≈ 120 g). */
    val referenceQty: Double? = null,
    val referenceLabel: String? = null,
)

/** Meta opcional de una categoría (p. ej. "Fruta: 2 porciones/día"). */
data class CategoryTarget(
    val category: String,
    val targetQuantity: Double,
    val targetUnit: String,
)

/** Un total de macros (calorías, proteína, carbohidratos, grasa). */
data class Macros(
    val calories: Double = 0.0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
) {
    operator fun plus(other: Macros) = Macros(
        calories = calories + other.calories,
        protein = protein + other.protein,
        carbs = carbs + other.carbs,
        fat = fat + other.fat,
    )
}

/**
 * El plan de alimentación activo del cliente, ya resuelto: objetivo, metas
 * diarias, metas por categoría y el catálogo completo de alimentos (no una
 * whitelist — el cliente elige libremente), agrupado por categoría para la UI.
 */
data class ActiveMealPlan(
    val assignmentId: String,
    val mealPlanId: String,
    val gymId: String,
    val name: String,
    val goal: String?,
    val description: String?,
    val notes: String?,
    val dailyCaloriesTarget: Double?,
    val dailyProteinTarget: Double?,
    val dailyCarbsTarget: Double?,
    val dailyFatTarget: Double?,
    val categoryTargets: List<CategoryTarget>,
    val allowedFoods: List<AllowedFood>,
) {
    val foodsByCategory: Map<String, List<AllowedFood>>
        get() = allowedFoods.groupBy { it.category }
}

/** Una fila de la lista "Alimentación": un plan asignado, sin cargar todavía su detalle completo. */
data class AssignedMealPlanSummary(
    val assignmentId: String,
    val mealPlanId: String,
    val name: String,
    val goal: String?,
    val status: String?,
)

/** Orden fijo de despliegue de los momentos del día, Desayuno primero. */
val MEAL_TYPE_ORDER: List<Pair<String, String>> = listOf(
    "DESAYUNO" to "Desayuno",
    "MEDIA_MANANA" to "Media mañana",
    "ALMUERZO" to "Almuerzo",
    "MERIENDA" to "Merienda",
    "CENA" to "Cena",
    "POST_ENTRENO" to "Post-entreno",
    "OTRO" to "Otro",
)

fun mealTypeLabel(mealType: String): String =
    MEAL_TYPE_ORDER.firstOrNull { it.first == mealType }?.second ?: "Otro"

fun mealPlanGoalLabel(goal: String?): String = when (goal) {
    "PERDIDA_PESO" -> "Pérdida de peso"
    "MANTENIMIENTO" -> "Mantenimiento"
    "GANANCIA_MUSCULAR" -> "Ganancia muscular"
    "RECOMPOSICION" -> "Recomposición corporal"
    "OTRO" -> "Otro"
    else -> "Sin objetivo definido"
}

fun mealCategoryLabel(category: String): String = when (category) {
    "PROTEINA" -> "Proteína"
    "CARBOHIDRATO" -> "Carbohidrato"
    "LEGUMBRE" -> "Legumbre"
    "VERDURA" -> "Verdura"
    "FRUTA" -> "Fruta"
    "LACTEO" -> "Lácteo"
    "GRASA" -> "Grasa"
    "BEBIDA" -> "Bebida"
    else -> "Otro"
}

fun mealCategoryEmoji(category: String): String = when (category) {
    "PROTEINA" -> "🥩" // 🥩
    "CARBOHIDRATO" -> "🍚" // 🍚
    "LEGUMBRE" -> "🫘" // 🫘
    "VERDURA" -> "🥦" // 🥦
    "FRUTA" -> "🍎" // 🍎
    "LACTEO" -> "🥛" // 🥛
    "GRASA" -> "🥑" // 🥑
    "BEBIDA" -> "🥤" // 🥤
    else -> "🍽️" // 🍽️
}

/**
 * Calcula los macros de una cantidad de un alimento del catálogo. Los
 * alimentos con `defaultUnit` g/ml traen sus macros por cada 100 g/ml
 * (escalan por `cantidad/100`); el resto (unidad, porción, cucharada, taza)
 * trae sus macros por unidad (escalan directo por `cantidad`).
 */
fun computeMacros(food: AllowedFood, quantity: Double): Macros {
    val scale = if (food.defaultUnit == "g" || food.defaultUnit == "ml") quantity / 100.0 else quantity
    return Macros(
        calories = (food.caloriesKcal ?: 0.0) * scale,
        protein = (food.proteinG ?: 0.0) * scale,
        carbs = (food.carbsG ?: 0.0) * scale,
        fat = (food.fatG ?: 0.0) * scale,
    )
}

/**
 * Lee el plan de alimentación del cliente desde Firestore. El plan en sí y
 * sus metas por categoría son de solo lectura: los define el entrenador
 * desde el panel administrativo. El cliente arma sus propias comidas
 * eligiendo libremente de TODO el catálogo de alimentos (ver
 * MealLogRepository) — no hay whitelist por plan.
 *
 * Lecturas: mealPlanAssignments del cliente (pocas) para resolver el plan
 * activo; mealPlan (1) + mealPlanCategoryTargets filtrados por mealPlanId
 * para el detalle; foodLibrary (catálogo global) + gyms/{gymId}/foods
 * (alimentos propios del gimnasio) para el catálogo completo. El cache de
 * Firestore cubre relecturas y offline.
 */
class MealPlanRepository(
    private val db: FirebaseFirestore,
    private val session: ClientSession,
) {
    /**
     * Todo el catálogo de alimentos disponible para el cliente: el global
     * (`foodLibrary`) más los propios del gimnasio (`gyms/{gymId}/foods`).
     * Ya no se filtra por una whitelist de plan — el cliente elige libremente.
     */
    private suspend fun loadFoodCatalog(gymId: String): List<AllowedFood> {
        val library = db.collection("foodLibrary").get().await().documents
        val ownFoods = db.collection("gyms").document(gymId).collection("foods").get().await().documents
        return (library + ownFoods).mapNotNull { doc ->
            val d = doc.toObject(FoodDoc::class.java) ?: return@mapNotNull null
            val name = d.name ?: return@mapNotNull null
            val category = d.category ?: return@mapNotNull null
            AllowedFood(
                foodId = doc.id,
                name = name,
                category = category,
                defaultUnit = d.defaultUnit ?: "g",
                caloriesKcal = d.caloriesKcal,
                proteinG = d.proteinG,
                carbsG = d.carbsG,
                fatG = d.fatG,
                referenceQty = d.referenceQty,
                referenceLabel = d.referenceLabel,
            )
        }.sortedBy { it.name }
    }

    /**
     * Todos los planes de alimentación asignados al cliente (puede tener más
     * de uno a la vez, ej. "Bajar peso" y "Definición"), para la pantalla de
     * lista. Cada fila resuelve el `goal` con una lectura extra al plan
     * (`mealPlanAssignments` no lo denormaliza) — son pocas lecturas, un
     * cliente no tiene decenas de planes a la vez.
     */
    suspend fun listAssignedPlans(): Result<List<AssignedMealPlanSummary>> = runCatching {
        val s = session.require()

        val assignments = db.collection("clients").document(s.clientId)
            .collection("mealPlanAssignments").get().await()
            .documents.mapNotNull { doc ->
                doc.toObject(MealPlanAssignmentDoc::class.java)?.let { doc.id to it }
            }

        assignments.mapNotNull { (assignmentId, assignment) ->
            val mealPlanId = assignment.mealPlanId ?: return@mapNotNull null
            val goal = db.collection("gyms").document(s.gymId)
                .collection("mealPlans").document(mealPlanId).get().await()
                .toObject(MealPlanDoc::class.java)?.goal
            AssignedMealPlanSummary(
                assignmentId = assignmentId,
                mealPlanId = mealPlanId,
                name = assignment.mealPlanName ?: "Plan de alimentación",
                goal = goal,
                status = assignment.mealPlanStatus,
            )
        }.sortedByDescending { it.assignmentId }
    }.recoverCatching { e ->
        throw when (e) {
            is ClientSession.NotLinkedException -> e
            else -> Exception("No se pudo cargar tus planes de alimentación. Deslizá para reintentar.", e)
        }
    }

    /**
     * Detalle completo de UN plan puntual (el que el cliente eligió en la
     * lista) — objetivo, metas diarias, metas por categoría y el catálogo
     * completo de alimentos para armar sus comidas contra este plan.
     */
    suspend fun getPlanDetail(mealPlanId: String): Result<ActiveMealPlan> = runCatching {
        val s = session.require()

        val assignments = db.collection("clients").document(s.clientId)
            .collection("mealPlanAssignments")
            .whereEqualTo("mealPlanId", mealPlanId)
            .get().await()
            .documents.mapNotNull { doc ->
                doc.toObject(MealPlanAssignmentDoc::class.java)?.let { doc.id to it }
            }
        val (assignmentId, assignment) = assignments.firstOrNull()
            ?: throw NoSuchElementException("Ya no tenés asignado este plan de alimentación.")

        val plan = db.collection("gyms").document(s.gymId)
            .collection("mealPlans").document(mealPlanId).get().await()
            .toObject(MealPlanDoc::class.java)
            ?: throw NoSuchElementException("No encontramos tu plan. Puede que tu entrenador lo haya quitado.")

        val categoryTargets = db.collection("gyms").document(s.gymId)
            .collection("mealPlanCategoryTargets")
            .whereEqualTo("mealPlanId", mealPlanId)
            .get().await()
            .documents.mapNotNull { it.toObject(MealPlanCategoryTargetDoc::class.java) }
            .sortedBy { it.sortOrder ?: 0L }
            .mapNotNull { d ->
                val category = d.category ?: return@mapNotNull null
                val qty = d.targetQuantity ?: return@mapNotNull null
                CategoryTarget(category = category, targetQuantity = qty, targetUnit = d.targetUnit ?: "porciones")
            }

        val allowedFoods = loadFoodCatalog(s.gymId)

        ActiveMealPlan(
            assignmentId = assignmentId,
            mealPlanId = mealPlanId,
            gymId = s.gymId,
            name = assignment.mealPlanName ?: plan.name ?: "Plan de alimentación",
            goal = plan.goal,
            description = plan.description,
            notes = plan.notes,
            dailyCaloriesTarget = plan.dailyCaloriesTarget,
            dailyProteinTarget = plan.dailyProteinTarget,
            dailyCarbsTarget = plan.dailyCarbsTarget,
            dailyFatTarget = plan.dailyFatTarget,
            categoryTargets = categoryTargets,
            allowedFoods = allowedFoods,
        )
    }.recoverCatching { e ->
        throw when (e) {
            is ClientSession.NotLinkedException, is NoSuchElementException -> e
            else -> Exception("No se pudo cargar tu plan de alimentación. Deslizá para reintentar.", e)
        }
    }
}
