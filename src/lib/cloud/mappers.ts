/**
 * Traducción fila SQLite -> documento Firestore, una por entidad
 * sincronizable. Funciones PURAS (sin I/O) para poder testearlas.
 *
 * Reglas transversales:
 * - Nunca se copian campos privados: biometría (`face_embedding`,
 *   `face_consent`), fotos por archivo (`photo_path`), observaciones
 *   internas, hashes de contraseña, códigos de asistencia, etc.
 * - Firestore no acepta `undefined`: los ausentes van como `null`.
 * - Los ids de documento son los mismos que en SQLite (texto/UUID).
 */

export type OutboxEntity =
  | "gyms"
  | "trainers"
  | "membership_plans"
  | "clients"
  | "memberships"
  | "exercises"
  | "exercise_library"
  | "exercise_video"
  | "class_types"
  | "routines"
  | "routine_exercises"
  | "routine_assignments"
  | "classes"
  | "class_blocks"
  | "class_block_exercises"
  | "class_enrollments"
  | "measurements"
  | "foods"
  | "food_library"
  | "meal_plans"
  | "meal_plan_items"
  | "meal_plan_assignments"
  | "meal_plan_category_targets"
  | "meal_plan_allowed_foods";

export interface OutboxPayload {
  gymId?: string | null;
  clientId?: string | null;
  routineId?: string | null;
  classId?: string | null;
  blockId?: string | null;
  exerciseId?: string | null;
  mealPlanId?: string | null;
}

/** Fila cruda de SQLite: claves snake_case, valores ya JS. */
export type Row = Record<string, unknown>;

/** Segmentos de ruta Firestore: [colección, doc, colección, doc, ...]. */
export type CloudPath = string[];

export interface CloudUpsert {
  path: CloudPath;
  data: Record<string, unknown>;
}

// ---- helpers ----
const s = (v: unknown): string | null => (v === undefined || v === null || v === "" ? null : String(v));
const n = (v: unknown): number | null => (v === undefined || v === null || v === "" ? null : Number(v));
const b = (v: unknown): boolean => v === 1 || v === true || v === "1";

function requireStr(payload: OutboxPayload, key: keyof OutboxPayload): string {
  const value = payload[key];
  if (!value) throw new Error(`payload.${String(key)} ausente y requerido para la ruta Firestore`);
  return String(value);
}

// ---- rutas ----

/**
 * Ruta del documento en Firestore. Se usa tanto para UPSERT (junto con
 * `mapRowToData`) como para DELETE (donde solo se tiene entity/id/payload).
 */
export function cloudPath(entity: OutboxEntity, entityId: string, payload: OutboxPayload): CloudPath {
  const gymId = () => requireStr(payload, "gymId");
  const clientId = () => requireStr(payload, "clientId");
  switch (entity) {
    case "gyms":
      return ["gyms", entityId];
    case "trainers":
      return ["gyms", gymId(), "trainers", entityId];
    case "membership_plans":
      return ["gyms", gymId(), "membershipPlans", entityId];
    case "exercises":
      return ["gyms", gymId(), "exercises", entityId];
    case "exercise_library":
      return ["exerciseLibrary", entityId];
    case "exercise_video":
      // El doc se identifica por exerciseId (viene en el payload), no por
      // el id de la fila — así la app lo lee con .doc(exerciseId).
      return ["gyms", gymId(), "exerciseVideos", requireStr(payload, "exerciseId")];
    case "class_types":
      return ["gyms", gymId(), "classTypes", entityId];
    case "routines":
      return ["gyms", gymId(), "routines", entityId];
    case "routine_exercises":
      return ["gyms", gymId(), "routineExercises", entityId];
    case "classes":
      return ["gyms", gymId(), "classes", entityId];
    case "class_blocks":
      return ["gyms", gymId(), "classBlocks", entityId];
    case "class_block_exercises":
      return ["gyms", gymId(), "classBlockExercises", entityId];
    case "clients":
      return ["clients", entityId];
    case "memberships":
      return ["clients", clientId(), "memberships", entityId];
    case "routine_assignments":
      return ["clients", clientId(), "routineAssignments", entityId];
    case "class_enrollments":
      return ["clients", clientId(), "classEnrollments", entityId];
    case "measurements":
      return ["clients", clientId(), "measurements", entityId];
    case "foods":
      return ["gyms", gymId(), "foods", entityId];
    case "food_library":
      return ["foodLibrary", entityId];
    case "meal_plans":
      return ["gyms", gymId(), "mealPlans", entityId];
    case "meal_plan_items":
      return ["gyms", gymId(), "mealPlanItems", entityId];
    case "meal_plan_assignments":
      return ["clients", clientId(), "mealPlanAssignments", entityId];
    case "meal_plan_category_targets":
      return ["gyms", gymId(), "mealPlanCategoryTargets", entityId];
    case "meal_plan_allowed_foods":
      return ["gyms", gymId(), "mealPlanAllowedFoods", entityId];
    default: {
      const _exhaustive: never = entity;
      throw new Error(`Entidad desconocida: ${_exhaustive}`);
    }
  }
}

// ---- datos ----

export function mapRowToData(entity: OutboxEntity, row: Row): Record<string, unknown> {
  switch (entity) {
    case "gyms":
      // La licencia (licenseStatus / licenseExpiresAt) NO se escribe desde
      // acá: la administra la consola de operador. El panel solo aporta
      // marca y contacto, y el worker sincroniza `gyms` con `merge` para no
      // pisar los campos del operador.
      return {
        name: s(row.name),
        slug: s(row.slug),
        brandColor: s(row.brand_color),
        logoBase64: s(row.logo_base64),
        phone: s(row.phone),
        email: s(row.email),
        address: s(row.address),
        city: s(row.city),
      };
    case "trainers":
      return {
        gymId: s(row.gym_id),
        name: s(row.name),
        specialty: s(row.specialty),
        status: s(row.status),
      };
    case "membership_plans":
      return {
        gymId: s(row.gym_id),
        name: s(row.name),
        durationDays: n(row.duration_days),
        price: n(row.price),
        description: s(row.description),
        active: b(row.active),
      };
    case "exercises":
    case "exercise_library": {
      const base = {
        name: s(row.name),
        category: s(row.category),
        description: s(row.description),
        muscleGroup: s(row.muscle_group),
        secondaryMuscles: s(row.secondary_muscles),
        level: s(row.level),
        exerciseType: s(row.exercise_type),
        equipment: s(row.equipment),
        instructions: s(row.instructions),
        commonMistakes: s(row.common_mistakes),
        // El video ya NO va acá: cada gimnasio pone el suyo en
        // gyms/{g}/exerciseVideos/{exerciseId} (entity "exercise_video").
        status: s(row.status),
      };
      // La biblioteca global no pertenece a un gimnasio.
      return entity === "exercises" ? { ...base, gymId: s(row.gym_id) } : base;
    }
    case "exercise_video":
      return { videoUrl: s(row.video_url) };
    case "class_types":
      return { gymId: s(row.gym_id), name: s(row.name), status: s(row.status) };
    case "routines":
      return {
        gymId: s(row.gym_id),
        name: s(row.name),
        description: s(row.description),
        status: s(row.status),
        notes: s(row.notes),
        exerciseCount: n(row.exercise_count) ?? 0,
      };
    case "routine_exercises":
      return {
        gymId: s(row.gym_id),
        routineId: s(row.routine_id),
        exerciseId: s(row.exercise_id),
        exerciseName: s(row.exercise_name),
        sets: n(row.sets),
        reps: n(row.reps),
        weight: n(row.weight),
        restSeconds: n(row.rest_seconds),
        notes: s(row.notes),
        sortOrder: n(row.sort_order) ?? 0,
        timeValue: n(row.time_value),
        timeUnit: s(row.time_unit),
        speedKmh: n(row.speed_kmh),
        inclinePercent: n(row.incline_percent),
        resistanceLevel: n(row.resistance_level),
        rpm: n(row.rpm),
        intensityLabel: s(row.intensity_label),
      };
    case "routine_assignments":
      return {
        gymId: s(row.gym_id),
        clientId: s(row.client_id),
        routineId: s(row.routine_id),
        routineName: s(row.routine_name),
        routineStatus: s(row.routine_status),
        exerciseCount: n(row.exercise_count) ?? 0,
        startDate: s(row.start_date),
        endDate: s(row.end_date),
      };
    case "classes":
      return {
        gymId: s(row.gym_id),
        classTypeId: s(row.class_type_id),
        classTypeName: s(row.class_type_name),
        trainerId: s(row.trainer_id),
        trainerName: s(row.trainer_name),
        name: s(row.name),
        date: s(row.date),
        startTime: s(row.start_time),
        endTime: s(row.end_time),
        capacity: n(row.capacity) ?? 0,
        status: s(row.status),
        description: s(row.description),
        notes: s(row.notes),
        recurrenceGroupId: s(row.recurrence_group_id),
        enrolledCount: n(row.enrolled_count) ?? 0,
      };
    case "class_blocks":
      return {
        gymId: s(row.gym_id),
        classId: s(row.class_id),
        name: s(row.name),
        blockType: s(row.block_type),
        sortOrder: n(row.sort_order) ?? 0,
      };
    case "class_block_exercises":
      return {
        gymId: s(row.gym_id),
        classId: s(row.class_id),
        blockId: s(row.block_id),
        exerciseId: s(row.exercise_id),
        exerciseName: s(row.exercise_name),
        sets: n(row.sets),
        reps: n(row.reps),
        weight: n(row.weight),
        restSeconds: n(row.rest_seconds),
        notes: s(row.notes),
        sortOrder: n(row.sort_order) ?? 0,
        timeValue: n(row.time_value),
        timeUnit: s(row.time_unit),
        speedKmh: n(row.speed_kmh),
        inclinePercent: n(row.incline_percent),
        resistanceLevel: n(row.resistance_level),
        rpm: n(row.rpm),
        intensityLabel: s(row.intensity_label),
      };
    case "clients":
      return {
        gymId: s(row.gym_id),
        name: s(row.name),
        document: s(row.document),
        phone: s(row.phone),
        email: s(row.email),
        goal: s(row.goal),
        gender: s(row.gender),
        birthDate: s(row.birth_date),
        trainerId: s(row.trainer_id),
        trainerName: s(row.trainer_name),
        joinDate: s(row.join_date),
        status: s(row.status),
        weight: n(row.weight),
        height: n(row.height),
        waist: n(row.waist),
        chest: n(row.chest),
        arm: n(row.arm),
        leg: n(row.leg),
        calf: n(row.calf),
        hip: n(row.hip),
        muscleMass: n(row.muscle_mass),
      };
    case "memberships":
      return {
        gymId: s(row.gym_id),
        clientId: s(row.client_id),
        planId: s(row.plan_id),
        planName: s(row.plan_name),
        startDate: s(row.start_date),
        endDate: s(row.end_date),
        price: n(row.price),
        paymentStatus: s(row.payment_status),
        manualStatus: s(row.manual_status),
      };
    case "class_enrollments":
      return {
        gymId: s(row.gym_id),
        clientId: s(row.client_id),
        classId: s(row.class_id),
        status: s(row.status),
        className: s(row.class_name),
        classDate: s(row.class_date),
        classStartTime: s(row.class_start_time),
      };
    case "measurements":
      return {
        gymId: s(row.gym_id),
        clientId: s(row.client_id),
        date: s(row.date),
        weight: n(row.weight),
        height: n(row.height),
        waist: n(row.waist),
        chest: n(row.chest),
        arm: n(row.arm),
        leg: n(row.leg),
        calf: n(row.calf),
        hip: n(row.hip),
        bodyFat: n(row.body_fat),
        muscleMass: n(row.muscle_mass),
        notes: s(row.notes),
      };
    case "foods":
      return {
        gymId: s(row.gym_id),
        name: s(row.name),
        category: s(row.category),
        defaultUnit: s(row.default_unit),
        caloriesKcal: n(row.calories_kcal),
        proteinG: n(row.protein_g),
        carbsG: n(row.carbs_g),
        fatG: n(row.fat_g),
        fiberG: n(row.fiber_g),
        imageBase64: s(row.image_base64),
        referenceQty: n(row.reference_qty),
        referenceLabel: s(row.reference_label),
      };
    case "food_library":
      return {
        name: s(row.name),
        category: s(row.category),
        defaultUnit: s(row.default_unit),
        caloriesKcal: n(row.calories_kcal),
        proteinG: n(row.protein_g),
        carbsG: n(row.carbs_g),
        fatG: n(row.fat_g),
        fiberG: n(row.fiber_g),
        imageBase64: s(row.image_base64),
        referenceQty: n(row.reference_qty),
        referenceLabel: s(row.reference_label),
      };
    case "meal_plans":
      return {
        gymId: s(row.gym_id),
        name: s(row.name),
        description: s(row.description),
        status: s(row.status),
        goal: s(row.goal),
        notes: s(row.notes),
        dailyCaloriesTarget: n(row.daily_calories_target),
        dailyProteinTarget: n(row.daily_protein_target),
        dailyCarbsTarget: n(row.daily_carbs_target),
        dailyFatTarget: n(row.daily_fat_target),
        itemCount: n(row.item_count) ?? 0,
      };
    case "meal_plan_category_targets":
      return {
        gymId: s(row.gym_id),
        mealPlanId: s(row.meal_plan_id),
        category: s(row.category),
        targetQuantity: n(row.target_quantity) ?? 0,
        targetUnit: s(row.target_unit),
        sortOrder: n(row.sort_order) ?? 0,
      };
    case "meal_plan_allowed_foods":
      return {
        gymId: s(row.gym_id),
        mealPlanId: s(row.meal_plan_id),
        foodId: s(row.food_id),
        foodName: s(row.food_name),
        category: s(row.category),
        defaultUnit: s(row.default_unit),
        caloriesKcal: n(row.calories_kcal),
        proteinG: n(row.protein_g),
        carbsG: n(row.carbs_g),
        fatG: n(row.fat_g),
      };
    case "meal_plan_items":
      return {
        gymId: s(row.gym_id),
        mealPlanId: s(row.meal_plan_id),
        foodId: s(row.food_id),
        foodName: s(row.food_name),
        customFoodName: s(row.custom_food_name),
        mealType: s(row.meal_type),
        quantity: n(row.quantity) ?? 0,
        unit: s(row.unit),
        caloriesKcal: n(row.calories_kcal),
        proteinG: n(row.protein_g),
        carbsG: n(row.carbs_g),
        fatG: n(row.fat_g),
        notes: s(row.notes),
        photoBase64: s(row.photo_base64),
        sortOrder: n(row.sort_order) ?? 0,
      };
    case "meal_plan_assignments":
      return {
        gymId: s(row.gym_id),
        clientId: s(row.client_id),
        mealPlanId: s(row.meal_plan_id),
        mealPlanName: s(row.meal_plan_name),
        mealPlanStatus: s(row.meal_plan_status),
        itemCount: n(row.item_count) ?? 0,
        startDate: s(row.start_date),
        endDate: s(row.end_date),
      };
    default: {
      const _exhaustive: never = entity;
      throw new Error(`Entidad desconocida: ${_exhaustive}`);
    }
  }
}

export function mapRowToUpsert(
  entity: OutboxEntity,
  entityId: string,
  payload: OutboxPayload,
  row: Row,
): CloudUpsert {
  return { path: cloudPath(entity, entityId, payload), data: mapRowToData(entity, row) };
}
