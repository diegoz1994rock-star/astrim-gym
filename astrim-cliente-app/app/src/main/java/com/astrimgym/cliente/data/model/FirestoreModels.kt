package com.astrimgym.cliente.data.model

import com.google.firebase.firestore.IgnoreExtraProperties

/**
 * Modelos de los documentos de Firestore que la app LEE. Los escribe el
 * panel administrativo (astrim-gym) vía su outbox — la app de clientes, por
 * ahora, solo lee. Todos los campos son opcionales/nulos: un documento
 * recién sincronizado puede no tenerlos todos.
 *
 * `@IgnoreExtraProperties`: el panel agrega campos de servicio (_syncedAt,
 * createdAt) que la app no necesita — sin esto, Firestore loguea un warning
 * por cada uno.
 *
 * Se usan con `DocumentSnapshot.toObject(Clase::class.java)`, por eso son
 * data classes con valores por defecto y constructor vacío implícito.
 */

/** userIndex/{uid} — el puente uid -> gimnasio/cliente/rol. */
@IgnoreExtraProperties
data class UserIndexDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val role: String? = null,
)

/** gyms/{gymId} — identidad y marca del gimnasio. */
@IgnoreExtraProperties
data class GymDoc(
    val name: String? = null,
    val slug: String? = null,
    val brandColor: String? = null,
    val logoBase64: String? = null,
    val licenseStatus: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val city: String? = null,
)

/** clients/{clientId} — perfil del cliente (sin datos privados/biometría). */
@IgnoreExtraProperties
data class ClientDoc(
    val gymId: String? = null,
    val name: String? = null,
    val document: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val goal: String? = null,
    val gender: String? = null,
    val birthDate: String? = null,
    val trainerId: String? = null,
    val trainerName: String? = null,
    val joinDate: String? = null,
    val status: String? = null,
    // Medidas corporales actuales — las carga el gimnasio, el cliente solo las ve.
    val weight: Double? = null,
    val height: Double? = null, // metros, ej. 1.78
    val waist: Double? = null,
    val chest: Double? = null,
    val arm: Double? = null,
    val leg: Double? = null,
    val calf: Double? = null,
    val hip: Double? = null,
    val muscleMass: Double? = null,
)

/**
 * clients/{clientId}/routineAssignments/{id} — rutina asignada a este
 * cliente. Trae `routineName` y `exerciseCount` denormalizados para que
 * Inicio no tenga que leer también el doc de la rutina.
 */
@IgnoreExtraProperties
data class RoutineAssignmentDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val routineId: String? = null,
    val routineName: String? = null,
    val routineStatus: String? = null,
    val exerciseCount: Long? = null,
    val startDate: String? = null,
    val endDate: String? = null,
)

/** clients/{clientId}/memberships/{id} — una membresía del cliente. */
@IgnoreExtraProperties
data class MembershipDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val planId: String? = null,
    val planName: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val price: Double? = null,
    val paymentStatus: String? = null,
    val manualStatus: String? = null,
)

/** gyms/{gymId}/routines/{id} — la rutina en sí (plantilla). */
@IgnoreExtraProperties
data class RoutineDoc(
    val gymId: String? = null,
    val name: String? = null,
    val description: String? = null,
    val status: String? = null,
    val notes: String? = null,
    val exerciseCount: Long? = null,
    val trainerId: String? = null,
)

/** gyms/{gymId}/routineExercises/{id} — un ejercicio dentro de una rutina, con su config. */
@IgnoreExtraProperties
data class RoutineExerciseDoc(
    val gymId: String? = null,
    val routineId: String? = null,
    val exerciseId: String? = null,
    val exerciseName: String? = null,
    val sets: Long? = null,
    val reps: Long? = null,
    val weight: Double? = null,
    val restSeconds: Long? = null,
    val notes: String? = null,
    val sortOrder: Long? = null,
    val timeValue: Double? = null,
    val timeUnit: String? = null,
    val speedKmh: Double? = null,
    val inclinePercent: Double? = null,
    val resistanceLevel: Long? = null,
    val rpm: Long? = null,
    val intensityLabel: String? = null,
)

/**
 * clients/{clientId}/mealPlanAssignments/{id} — plan de alimentación
 * asignado a este cliente. Trae `mealPlanName` e `itemCount` denormalizados,
 * igual que RoutineAssignmentDoc.
 */
@IgnoreExtraProperties
data class MealPlanAssignmentDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val mealPlanId: String? = null,
    val mealPlanName: String? = null,
    val mealPlanStatus: String? = null,
    val itemCount: Long? = null,
    val startDate: String? = null,
    val endDate: String? = null,
)

/**
 * gyms/{gymId}/mealPlans/{id} — el plan de alimentación en sí (plantilla).
 * El entrenador ya no prescribe comidas fijas: define un objetivo, metas
 * diarias de macros y una whitelist de alimentos permitidos (ver
 * MealPlanCategoryTargetDoc / MealPlanAllowedFoodDoc). `itemCount` es un
 * campo legado del diseño anterior, ya no tiene significado.
 */
@IgnoreExtraProperties
data class MealPlanDoc(
    val gymId: String? = null,
    val name: String? = null,
    val description: String? = null,
    val status: String? = null,
    val goal: String? = null,
    val notes: String? = null,
    val dailyCaloriesTarget: Double? = null,
    val dailyProteinTarget: Double? = null,
    val dailyCarbsTarget: Double? = null,
    val dailyFatTarget: Double? = null,
    val itemCount: Long? = null,
)

/**
 * gyms/{gymId}/mealPlanCategoryTargets/{id} — meta opcional por categoría de
 * un plan (p. ej. "Proteína: 180 g/día", "Fruta: 2 porciones/día").
 * Colección FLAT: se filtra con `.whereEqualTo("mealPlanId", planId)`.
 */
@IgnoreExtraProperties
data class MealPlanCategoryTargetDoc(
    val gymId: String? = null,
    val mealPlanId: String? = null,
    val category: String? = null,
    val targetQuantity: Double? = null,
    val targetUnit: String? = null,
    val sortOrder: Long? = null,
)

/**
 * gyms/{gymId}/mealPlanAllowedFoods/{id} — sin uso desde que el cliente elige
 * libremente entre todo el catálogo en vez de una whitelist por plan (ver
 * FoodDoc). Se deja el modelo por si se retoma la restricción a futuro.
 */
@IgnoreExtraProperties
data class MealPlanAllowedFoodDoc(
    val gymId: String? = null,
    val mealPlanId: String? = null,
    val foodId: String? = null,
    val foodName: String? = null,
    val category: String? = null,
    val defaultUnit: String? = null,
    val caloriesKcal: Double? = null,
    val proteinG: Double? = null,
    val carbsG: Double? = null,
    val fatG: Double? = null,
)

/**
 * Catálogo de alimentos: `foodLibrary/{foodId}` (global, compartido entre
 * gimnasios) y `gyms/{gymId}/foods/{foodId}` (propios de un gimnasio) usan
 * exactamente esta forma — el cliente lee ambas colecciones y las combina
 * para elegir libremente cualquier alimento al registrar una comida. Macros
 * por 100 g/ml, o por unidad cuando `defaultUnit` es `unidad`/`porcion`.
 */
@IgnoreExtraProperties
data class FoodDoc(
    val gymId: String? = null,
    val name: String? = null,
    val category: String? = null,
    val defaultUnit: String? = null,
    val caloriesKcal: Double? = null,
    val proteinG: Double? = null,
    val carbsG: Double? = null,
    val fatG: Double? = null,
    val fiberG: Double? = null,
    val imageBase64: String? = null,
    // Porción de referencia en términos cotidianos (ej. "1 banano mediano" ≈ 120 g) —
    // solo completa para alimentos donde default_unit (g/ml) por sí solo no dice nada.
    val referenceQty: Double? = null,
    val referenceLabel: String? = null,
)

/**
 * clients/{clientId}/mealLogEntries/{id} — un alimento que el propio cliente
 * registró como consumido. Lo escribe esta misma app (ver
 * MealLogRepository), igual que WorkoutSessionDoc. Los macros ya vienen
 * calculados al momento de loguear (cantidad × macros del alimento).
 */
@IgnoreExtraProperties
data class MealLogEntryDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val mealPlanId: String? = null,
    val date: String? = null,
    val mealType: String? = null,
    val foodId: String? = null,
    val foodName: String? = null,
    val category: String? = null,
    val quantity: Double? = null,
    val unit: String? = null,
    val caloriesKcal: Double? = null,
    val proteinG: Double? = null,
    val carbsG: Double? = null,
    val fatG: Double? = null,
    val photoBase64: String? = null,
    val createdAt: String? = null,
)

/**
 * exerciseLibrary/{id} (global) o gyms/{gymId}/exercises/{id} (propio del
 * gimnasio) — la ficha del ejercicio: instrucciones, errores, video, etc.
 */
@IgnoreExtraProperties
data class ExerciseDoc(
    val name: String? = null,
    val category: String? = null,
    val description: String? = null,
    val muscleGroup: String? = null,
    val secondaryMuscles: String? = null,
    val level: String? = null,
    val equipment: String? = null,
    val instructions: String? = null,
    val commonMistakes: String? = null,
    val videoPath: String? = null,
)

/**
 * gyms/{gymId}/exerciseVideos/{exerciseId} — el video de ESTE gimnasio para
 * ese ejercicio. El catálogo (exerciseLibrary / gyms/{g}/exercises) es
 * compartido y no lleva video; cada dueño graba y pone el suyo.
 */
@IgnoreExtraProperties
data class ExerciseVideoDoc(
    val videoUrl: String? = null,
)

/**
 * clients/{clientId}/classEnrollments/{id} — inscripción del cliente a una
 * clase. Trae `className`, `classDate` (YYYY-MM-DD) y `classStartTime`
 * (HH:mm) denormalizados; para el resto (fin, entrenador, descripción) se
 * lee gyms/{gymId}/classes/{classId}.
 */
@IgnoreExtraProperties
data class ClassEnrollmentDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val classId: String? = null,
    val status: String? = null,
    val className: String? = null,
    val classDate: String? = null,
    val classStartTime: String? = null,
)

/** gyms/{gymId}/classes/{id} — la clase grupal programada. */
@IgnoreExtraProperties
data class ClassDoc(
    val gymId: String? = null,
    val classTypeName: String? = null,
    val trainerName: String? = null,
    val name: String? = null,
    val date: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val capacity: Long? = null,
    val status: String? = null,
    val description: String? = null,
    val notes: String? = null,
    val enrolledCount: Long? = null,
)

/**
 * clients/{clientId}/workoutSessions/{id} — sesión de entrenamiento que
 * escribe esta misma app al terminar el Modo Entrenamiento (ver
 * WorkoutRepository). `startedAt`/`endedAt` son epoch millis.
 */
@IgnoreExtraProperties
data class WorkoutSessionDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val routineId: String? = null,
    val routineName: String? = null,
    val startedAt: Long? = null,
    val endedAt: Long? = null,
    val durationSeconds: Long? = null,
    val status: String? = null,
    val totalSets: Long? = null,
    val totalVolume: Double? = null,
)

/** clients/{clientId}/measurements/{id} — medida corporal cargada por el gimnasio. */
@IgnoreExtraProperties
data class MeasurementDoc(
    val gymId: String? = null,
    val clientId: String? = null,
    val date: String? = null,
    val weight: Double? = null,
    val height: Double? = null,
    val waist: Double? = null,
    val chest: Double? = null,
    val arm: Double? = null,
    val leg: Double? = null,
    val calf: Double? = null,
    val hip: Double? = null,
    val bodyFat: Double? = null,
    val muscleMass: Double? = null,
    val notes: String? = null,
)
