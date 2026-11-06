import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getCloudDb, isCloudConfigured } from "./firebase";
import { currentCloudUser } from "./cloudAuth";
import { getDb } from "../db/client";
import * as outboxRepository from "../repositories/outboxRepository";
import { markBackfillsDone, withSyncPaused } from "../sync/OutboxSyncWorker";

/**
 * Restaura desde Firestore TODO lo que el panel sincroniza, para cuando el
 * dueño formatea, cambia o pierde la PC: instala el panel, inicia sesión y
 * el gimnasio queda como estaba.
 *
 * Trae: perfil del gimnasio (contacto, marca), entrenadores, planes de
 * membresía, ejercicios propios y sus videos, alimentos propios, clientes
 * (con su cuenta de la app y su código de asistencia), rutinas, clases
 * (bloques y ejercicios), planes de alimentación (items, metas, alimentos
 * permitidos) y, por cliente, membresías, pagos, asistencias, medidas,
 * rutinas/planes asignados e inscripciones a clases.
 *
 * NO trae lo que nunca sube a la nube por privacidad: biometría facial,
 * fotos locales y observaciones internas.
 *
 * Cada fila entra con `ON CONFLICT DO NOTHING`: no pisa nada que ya exista
 * localmente, así que se puede correr varias veces sin problema. Durante la
 * restauración la sincronización queda en pausa y lo que encolan los
 * triggers se descarta (son datos que acaban de bajar de la nube).
 */

export interface RestoreSummary {
  gymProfile: boolean;
  trainers: number;
  membershipPlans: number;
  exercises: number;
  exerciseVideos: number;
  foods: number;
  clients: number;
  classTypes: number;
  routines: number;
  routineExercises: number;
  classes: number;
  classBlocks: number;
  classBlockExercises: number;
  mealPlans: number;
  mealPlanItems: number;
  mealPlanTargets: number;
  mealPlanAllowedFoods: number;
  memberships: number;
  payments: number;
  attendance: number;
  measurements: number;
  routineAssignments: number;
  mealPlanAssignments: number;
  classEnrollments: number;
  errors: string[];
}

export type RestoreProgress = (message: string) => void;

type CloudDoc = Record<string, unknown>;
type Val = string | number | null;

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const key = (name: string | null): string => (name ?? "").trim().toLowerCase();

/** Máximo de variables por sentencia, holgado bajo el límite de SQLite. */
const MAX_VARS = 900;

/**
 * Inserta en lotes multi-fila (mucho más rápido que fila por fila a través
 * del puente de Tauri). Si un lote falla (p. ej. una FK rota), reintenta
 * ese lote fila por fila para no perder las demás.
 */
async function insertRows(
  table: string,
  columns: string[],
  rows: Val[][],
  errors: string[],
  label: string,
): Promise<number> {
  if (rows.length === 0) return 0;
  const db = await getDb();
  const perChunk = Math.max(1, Math.floor(MAX_VARS / columns.length));
  const head = `INSERT INTO ${table} (${columns.join(", ")}) VALUES `;
  const tuple = (offset: number) =>
    `(${columns.map((_, i) => `$${offset + i + 1}`).join(", ")})`;
  let affected = 0;
  let failedRows = 0;
  let firstError: string | null = null;

  for (let i = 0; i < rows.length; i += perChunk) {
    const chunk = rows.slice(i, i + perChunk);
    const sql =
      head + chunk.map((_, r) => tuple(r * columns.length)).join(", ") + " ON CONFLICT DO NOTHING";
    try {
      const res = await db.execute(sql, chunk.flat());
      affected += res.rowsAffected ?? 0;
    } catch {
      for (const values of chunk) {
        try {
          const res = await db.execute(head + tuple(0) + " ON CONFLICT DO NOTHING", values);
          affected += res.rowsAffected ?? 0;
        } catch (err) {
          failedRows += 1;
          firstError ??= err instanceof Error ? err.message : String(err);
        }
      }
    }
  }
  if (failedRows > 0) {
    errors.push(`${label}: ${failedRows} no se pudieron restaurar (${firstError})`);
  }
  return affected;
}

async function step(label: string, errors: string[], fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function localIds(sql: string, params: Val[]): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(sql, params);
  return new Set(rows.map((r) => r.id));
}

async function localNameIndex(sql: string, params: Val[]): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.select<{ id: string; name: string }[]>(sql, params);
  const map = new Map<string, string>();
  rows.forEach((r) => map.set(key(r.name), r.id));
  return map;
}

/** Ejecuta `fn` sobre `items` con concurrencia acotada. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function emptySummary(): RestoreSummary {
  return {
    gymProfile: false,
    trainers: 0,
    membershipPlans: 0,
    exercises: 0,
    exerciseVideos: 0,
    foods: 0,
    clients: 0,
    classTypes: 0,
    routines: 0,
    routineExercises: 0,
    classes: 0,
    classBlocks: 0,
    classBlockExercises: 0,
    mealPlans: 0,
    mealPlanItems: 0,
    mealPlanTargets: 0,
    mealPlanAllowedFoods: 0,
    memberships: 0,
    payments: 0,
    attendance: 0,
    measurements: 0,
    routineAssignments: 0,
    mealPlanAssignments: 0,
    classEnrollments: 0,
    errors: [],
  };
}

/** ¿La instalación no tiene todavía ningún cliente de este gimnasio? */
export async function isLocalGymEmpty(gymId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM clients WHERE gym_id = $1",
    [gymId],
  );
  return (rows[0]?.n ?? 0) === 0;
}

export async function restoreFromCloud(
  gymId: string,
  onProgress: RestoreProgress = () => {},
): Promise<RestoreSummary> {
  if (!isCloudConfigured) {
    throw new Error("La sincronización con la nube no está configurada en este equipo.");
  }
  if (!currentCloudUser()) {
    throw new Error("Iniciá sesión con la cuenta de la nube del gimnasio antes de restaurar.");
  }
  return withSyncPaused(async () => {
    const wasEmpty = await isLocalGymEmpty(gymId);
    const mark = await outboxRepository.maxOutboxRowid();
    try {
      return await restoreAll(gymId, onProgress);
    } finally {
      await outboxRepository.discardPendingAfter(mark);
      if (wasEmpty) markBackfillsDone();
    }
  });
}

async function restoreAll(gymId: string, onProgress: RestoreProgress): Promise<RestoreSummary> {
  const cloud = getCloudDb();
  const db = await getDb();
  const summary = emptySummary();
  const errors = summary.errors;
  const gymCol = async (name: string) => (await getDocs(collection(cloud, "gyms", gymId, name))).docs;
  const data = (d: QueryDocumentSnapshot) => d.data() as CloudDoc;

  // ---- Perfil del gimnasio (contacto y marca; solo completa lo vacío) ----
  onProgress("Recuperando datos del gimnasio…");
  await step("Perfil del gimnasio", errors, async () => {
    const snap = await getDoc(doc(cloud, "gyms", gymId));
    if (!snap.exists()) return;
    const d = snap.data() as CloudDoc;
    await db.execute(
      `UPDATE gyms SET
         phone = COALESCE(phone, $1), email = COALESCE(email, $2),
         address = COALESCE(address, $3), city = COALESCE(city, $4),
         brand_color = COALESCE(brand_color, $5), logo_base64 = COALESCE(logo_base64, $6)
       WHERE id = $7`,
      [str(d.phone), str(d.email), str(d.address), str(d.city), str(d.brandColor), str(d.logoBase64), gymId],
    );
    summary.gymProfile = true;
  });

  // ---- Entrenadores ----
  onProgress("Recuperando entrenadores y planes…");
  await step("Entrenadores", errors, async () => {
    summary.trainers = await insertRows(
      "trainers",
      ["id", "gym_id", "name", "specialty", "status"],
      (await gymCol("trainers")).map((s) => {
        const d = data(s);
        return [s.id, gymId, str(d.name) ?? "(sin nombre)", str(d.specialty), oneOf(d.status, ["ACTIVE", "INACTIVE"], "ACTIVE")];
      }),
      errors,
      "Entrenadores",
    );
  });
  const trainerIds = await localIds("SELECT id FROM trainers WHERE gym_id = $1", [gymId]);

  // ---- Planes de membresía ----
  await step("Planes de membresía", errors, async () => {
    summary.membershipPlans = await insertRows(
      "membership_plans",
      ["id", "gym_id", "name", "duration_days", "price", "description", "active"],
      (await gymCol("membershipPlans")).map((s) => {
        const d = data(s);
        return [
          s.id, gymId, str(d.name) ?? "(sin nombre)", num(d.durationDays) ?? 30, num(d.price) ?? 0,
          str(d.description), d.active === false ? 0 : 1,
        ];
      }),
      errors,
      "Planes de membresía",
    );
  });

  // ---- Ejercicios propios del gimnasio ----
  onProgress("Recuperando ejercicios y alimentos…");
  await step("Ejercicios del gimnasio", errors, async () => {
    summary.exercises = await insertRows(
      "exercises",
      [
        "id", "gym_id", "name", "description", "muscle_group", "secondary_muscles",
        "level", "equipment", "instructions", "common_mistakes", "status",
        "exercise_type", "category",
      ],
      (await gymCol("exercises")).map((s) => {
        const d = data(s);
        return [
          s.id, gymId, str(d.name) ?? "(sin nombre)", str(d.description),
          str(d.muscleGroup), str(d.secondaryMuscles),
          d.level == null ? null : oneOf(d.level, ["BEGINNER", "INTERMEDIATE", "ADVANCED"], "INTERMEDIATE"),
          str(d.equipment), str(d.instructions), str(d.commonMistakes), str(d.status) ?? "ACTIVE",
          str(d.exerciseType), str(d.category),
        ];
      }),
      errors,
      "Ejercicios del gimnasio",
    );
  });

  // Los ejercicios de la biblioteca global pueden tener otro id en esta
  // instalación: se re-vinculan por id si existe, si no por nombre.
  const exerciseIds = await localIds("SELECT id FROM exercises WHERE gym_id IS NULL OR gym_id = $1", [gymId]);
  const exerciseByName = await localNameIndex(
    "SELECT id, name FROM exercises WHERE gym_id IS NULL OR gym_id = $1",
    [gymId],
  );
  const resolveExercise = (id: string | null, name: string | null): string | null =>
    (id && exerciseIds.has(id) ? id : null) ?? exerciseByName.get(key(name)) ?? null;

  await step("Videos de ejercicios", errors, async () => {
    const rows: Val[][] = [];
    for (const s of await gymCol("exerciseVideos")) {
      const url = str(data(s).videoUrl);
      if (!url || !exerciseIds.has(s.id)) continue;
      rows.push([crypto.randomUUID(), gymId, s.id, url]);
    }
    summary.exerciseVideos = await insertRows(
      "exercise_videos", ["id", "gym_id", "exercise_id", "video_url"], rows, errors, "Videos de ejercicios",
    );
  });

  // ---- Alimentos propios del gimnasio ----
  await step("Alimentos del gimnasio", errors, async () => {
    summary.foods = await insertRows(
      "foods",
      [
        "id", "gym_id", "name", "category", "default_unit", "calories_kcal", "protein_g",
        "carbs_g", "fat_g", "fiber_g", "reference_qty", "reference_label",
      ],
      (await gymCol("foods")).map((s) => {
        const d = data(s);
        return [
          s.id, gymId, str(d.name) ?? "(sin nombre)", str(d.category) ?? "OTROS", str(d.defaultUnit) ?? "g",
          num(d.caloriesKcal), num(d.proteinG), num(d.carbsG), num(d.fatG), num(d.fiberG),
          num(d.referenceQty), str(d.referenceLabel),
        ];
      }),
      errors,
      "Alimentos del gimnasio",
    );
  });
  const foodIds = await localIds("SELECT id FROM foods WHERE gym_id IS NULL OR gym_id = $1", [gymId]);
  const foodByName = await localNameIndex(
    "SELECT id, name FROM foods WHERE gym_id IS NULL OR gym_id = $1",
    [gymId],
  );
  const resolveFood = (id: string | null, name: string | null): string | null =>
    (id && foodIds.has(id) ? id : null) ?? foodByName.get(key(name)) ?? null;

  // ---- Clientes (+ cuenta de la app + código de asistencia) ----
  onProgress("Recuperando clientes…");
  const clientDocs = await (async () => {
    try {
      return (await getDocs(query(collection(cloud, "clients"), where("gymId", "==", gymId)))).docs;
    } catch (err) {
      errors.push(`Clientes: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  })();
  await step("Clientes", errors, async () => {
    summary.clients = await insertRows(
      "clients",
      [
        "id", "gym_id", "name", "document", "birth_date", "phone", "email", "gender",
        "goal", "trainer_id", "join_date", "status", "weight", "height", "waist",
        "chest", "arm", "leg", "calf", "hip", "muscle_mass", "cloud_uid", "attendance_code",
      ],
      clientDocs.map((s) => {
        const d = data(s);
        const trainerId = str(d.trainerId);
        return [
          s.id, gymId, str(d.name) ?? "(sin nombre)", str(d.document), str(d.birthDate),
          str(d.phone), str(d.email), str(d.gender), str(d.goal),
          trainerId && trainerIds.has(trainerId) ? trainerId : null,
          str(d.joinDate), oneOf(d.status, ["ACTIVE", "INACTIVE"], "ACTIVE"),
          num(d.weight), num(d.height), num(d.waist), num(d.chest), num(d.arm), num(d.leg),
          num(d.calf), num(d.hip), num(d.muscleMass), str(d.cloudUid), str(d.attendanceCode),
        ];
      }),
      errors,
      "Clientes",
    );
  });
  const clientIds = await localIds("SELECT id FROM clients WHERE gym_id = $1", [gymId]);

  // ---- Tipos de clase propios ----
  onProgress("Recuperando rutinas, clases y planes de alimentación…");
  await step("Tipos de clase", errors, async () => {
    summary.classTypes = await insertRows(
      "class_types",
      ["id", "gym_id", "name", "status"],
      (await gymCol("classTypes")).map((s) => {
        const d = data(s);
        return [s.id, gymId, str(d.name) ?? "(sin nombre)", str(d.status) ?? "ACTIVE"];
      }),
      errors,
      "Tipos de clase",
    );
  });

  // ---- Rutinas (plantillas) + ejercicios ----
  await step("Rutinas", errors, async () => {
    summary.routines = await insertRows(
      "routines",
      ["id", "gym_id", "name", "description", "status", "notes"],
      (await gymCol("routines")).map((s) => {
        const d = data(s);
        return [s.id, gymId, str(d.name) ?? "(sin nombre)", str(d.description), str(d.status) ?? "ACTIVE", str(d.notes)];
      }),
      errors,
      "Rutinas",
    );
  });
  const routineIds = await localIds("SELECT id FROM routines WHERE gym_id = $1", [gymId]);

  await step("Ejercicios de las rutinas", errors, async () => {
    const rows: Val[][] = [];
    for (const s of await gymCol("routineExercises")) {
      const d = data(s);
      const routineId = str(d.routineId);
      const exerciseId = resolveExercise(str(d.exerciseId), str(d.exerciseName));
      if (!routineId || !routineIds.has(routineId) || !exerciseId) continue;
      rows.push([
        s.id, routineId, exerciseId, num(d.sets), num(d.reps), num(d.weight),
        num(d.restSeconds), num(d.sortOrder) ?? 0, str(d.notes), num(d.timeValue),
        str(d.timeUnit), num(d.speedKmh), num(d.inclinePercent), num(d.resistanceLevel),
        num(d.rpm), str(d.intensityLabel),
      ]);
    }
    summary.routineExercises = await insertRows(
      "routine_exercises",
      [
        "id", "routine_id", "exercise_id", "sets", "reps", "weight", "rest_seconds",
        "sort_order", "notes", "time_value", "time_unit", "speed_kmh", "incline_percent",
        "resistance_level", "rpm", "intensity_label",
      ],
      rows,
      errors,
      "Ejercicios de las rutinas",
    );
  });

  // ---- Clases + bloques + ejercicios de bloque ----
  await step("Clases", errors, async () => {
    const classTypeIds = await localIds(
      "SELECT id FROM class_types WHERE gym_id IS NULL OR gym_id = $1",
      [gymId],
    );
    const classTypeByName = await localNameIndex(
      "SELECT id, name FROM class_types WHERE gym_id IS NULL OR gym_id = $1",
      [gymId],
    );
    const missingTypes: Val[][] = [];
    const rows: Val[][] = [];
    for (const s of await gymCol("classes")) {
      const d = data(s);
      let typeId = str(d.classTypeId);
      if (!typeId || !classTypeIds.has(typeId)) {
        const byName = classTypeByName.get(key(str(d.classTypeName)));
        if (byName) {
          typeId = byName;
        } else {
          // El tipo no existe acá: se recrea con el mismo id y nombre.
          typeId ??= crypto.randomUUID();
          missingTypes.push([typeId, gymId, str(d.classTypeName) ?? "Clase", "ACTIVE"]);
          classTypeIds.add(typeId);
          classTypeByName.set(key(str(d.classTypeName)), typeId);
        }
      }
      const trainerId = str(d.trainerId);
      rows.push([
        s.id, gymId, typeId, trainerId && trainerIds.has(trainerId) ? trainerId : null,
        str(d.name) ?? "(sin nombre)", str(d.date) ?? "", str(d.startTime) ?? "", str(d.endTime) ?? "",
        num(d.capacity) ?? 0, str(d.status) ?? "PROGRAMADA", str(d.description), str(d.notes),
        str(d.recurrenceGroupId),
      ]);
    }
    summary.classTypes += await insertRows(
      "class_types", ["id", "gym_id", "name", "status"], missingTypes, errors, "Tipos de clase",
    );
    summary.classes = await insertRows(
      "classes",
      [
        "id", "gym_id", "class_type_id", "trainer_id", "name", "date", "start_time", "end_time",
        "capacity", "status", "description", "notes", "recurrence_group_id",
      ],
      rows,
      errors,
      "Clases",
    );
  });
  const classIds = await localIds("SELECT id FROM classes WHERE gym_id = $1", [gymId]);

  await step("Bloques de clase", errors, async () => {
    const rows: Val[][] = [];
    for (const s of await gymCol("classBlocks")) {
      const d = data(s);
      const classId = str(d.classId);
      if (!classId || !classIds.has(classId)) continue;
      rows.push([s.id, classId, str(d.name) ?? "Bloque", str(d.blockType) ?? "PERSONALIZADO", num(d.sortOrder) ?? 0]);
    }
    summary.classBlocks = await insertRows(
      "class_blocks", ["id", "class_id", "name", "block_type", "sort_order"], rows, errors, "Bloques de clase",
    );
  });

  await step("Ejercicios de los bloques", errors, async () => {
    const blockIds = await localIds(
      "SELECT cb.id FROM class_blocks cb JOIN classes c ON c.id = cb.class_id WHERE c.gym_id = $1",
      [gymId],
    );
    const rows: Val[][] = [];
    for (const s of await gymCol("classBlockExercises")) {
      const d = data(s);
      const blockId = str(d.blockId);
      const exerciseId = resolveExercise(str(d.exerciseId), str(d.exerciseName));
      if (!blockId || !blockIds.has(blockId) || !exerciseId) continue;
      rows.push([
        s.id, blockId, exerciseId, num(d.sets), num(d.reps), num(d.weight), num(d.restSeconds),
        str(d.notes), num(d.sortOrder) ?? 0, num(d.timeValue), str(d.timeUnit), num(d.speedKmh),
        num(d.inclinePercent), num(d.resistanceLevel), num(d.rpm), str(d.intensityLabel),
      ]);
    }
    summary.classBlockExercises = await insertRows(
      "class_block_exercises",
      [
        "id", "block_id", "exercise_id", "sets", "reps", "weight", "rest_seconds", "notes",
        "sort_order", "time_value", "time_unit", "speed_kmh", "incline_percent",
        "resistance_level", "rpm", "intensity_label",
      ],
      rows,
      errors,
      "Ejercicios de los bloques",
    );
  });

  // ---- Planes de alimentación ----
  await step("Planes de alimentación", errors, async () => {
    summary.mealPlans = await insertRows(
      "meal_plans",
      [
        "id", "gym_id", "name", "description", "status", "notes", "goal",
        "daily_calories_target", "daily_protein_target", "daily_carbs_target", "daily_fat_target",
      ],
      (await gymCol("mealPlans")).map((s) => {
        const d = data(s);
        return [
          s.id, gymId, str(d.name) ?? "(sin nombre)", str(d.description),
          str(d.status) ?? "ACTIVE", str(d.notes), str(d.goal),
          num(d.dailyCaloriesTarget), num(d.dailyProteinTarget),
          num(d.dailyCarbsTarget), num(d.dailyFatTarget),
        ];
      }),
      errors,
      "Planes de alimentación",
    );
  });
  const mealPlanIds = await localIds("SELECT id FROM meal_plans WHERE gym_id = $1", [gymId]);

  await step("Items de los planes", errors, async () => {
    const rows: Val[][] = [];
    for (const s of await gymCol("mealPlanItems")) {
      const d = data(s);
      const mealPlanId = str(d.mealPlanId);
      if (!mealPlanId || !mealPlanIds.has(mealPlanId)) continue;
      const foodId = resolveFood(str(d.foodId), str(d.foodName));
      rows.push([
        s.id, mealPlanId, foodId,
        // Si el alimento no existe en esta PC, se conserva su nombre.
        str(d.customFoodName) ?? (foodId ? null : str(d.foodName)),
        str(d.mealType) ?? "DESAYUNO", num(d.quantity) ?? 1, str(d.unit) ?? "g",
        num(d.caloriesKcal), num(d.proteinG), num(d.carbsG), num(d.fatG),
        str(d.notes), str(d.photoBase64), num(d.sortOrder) ?? 0,
      ]);
    }
    summary.mealPlanItems = await insertRows(
      "meal_plan_items",
      [
        "id", "meal_plan_id", "food_id", "custom_food_name", "meal_type", "quantity",
        "unit", "calories_kcal", "protein_g", "carbs_g", "fat_g", "notes", "photo_base64",
        "sort_order",
      ],
      rows,
      errors,
      "Items de los planes",
    );
  });

  await step("Metas de los planes", errors, async () => {
    const rows: Val[][] = [];
    for (const s of await gymCol("mealPlanCategoryTargets")) {
      const d = data(s);
      const mealPlanId = str(d.mealPlanId);
      const category = str(d.category);
      if (!mealPlanId || !mealPlanIds.has(mealPlanId) || !category) continue;
      rows.push([s.id, mealPlanId, category, num(d.targetQuantity) ?? 0, str(d.targetUnit) ?? "g", num(d.sortOrder) ?? 0]);
    }
    summary.mealPlanTargets = await insertRows(
      "meal_plan_category_targets",
      ["id", "meal_plan_id", "category", "target_quantity", "target_unit", "sort_order"],
      rows,
      errors,
      "Metas de los planes",
    );
  });

  await step("Alimentos permitidos", errors, async () => {
    const rows: Val[][] = [];
    for (const s of await gymCol("mealPlanAllowedFoods")) {
      const d = data(s);
      const mealPlanId = str(d.mealPlanId);
      const foodId = resolveFood(str(d.foodId), str(d.foodName));
      if (!mealPlanId || !mealPlanIds.has(mealPlanId) || !foodId) continue;
      rows.push([s.id, mealPlanId, foodId]);
    }
    summary.mealPlanAllowedFoods = await insertRows(
      "meal_plan_allowed_foods", ["id", "meal_plan_id", "food_id"], rows, errors, "Alimentos permitidos",
    );
  });

  // ---- Historial por cliente ----
  const SUBS = [
    "memberships", "payments", "attendance", "measurements",
    "routineAssignments", "mealPlanAssignments", "classEnrollments",
  ] as const;
  type Sub = (typeof SUBS)[number];
  const bySub: Record<Sub, { clientId: string; id: string; d: CloudDoc }[]> = {
    memberships: [], payments: [], attendance: [], measurements: [],
    routineAssignments: [], mealPlanAssignments: [], classEnrollments: [],
  };
  const restorable = clientDocs.filter((s) => clientIds.has(s.id));
  let done = 0;
  let subErrors = 0;
  let firstSubError: string | null = null;
  await mapLimit(restorable, 6, async (clientSnap) => {
    for (const sub of SUBS) {
      try {
        const snap = await getDocs(
          query(collection(cloud, "clients", clientSnap.id, sub), where("gymId", "==", gymId)),
        );
        snap.docs.forEach((s) => bySub[sub].push({ clientId: clientSnap.id, id: s.id, d: data(s) }));
      } catch (err) {
        subErrors += 1;
        firstSubError ??= `${sub}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    done += 1;
    onProgress(`Recuperando historial de clientes (${done} de ${restorable.length})…`);
  });
  if (subErrors > 0) errors.push(`Historial: ${subErrors} consultas fallaron (${firstSubError})`);

  onProgress("Guardando historial…");

  // Membresías: si su plan ya no existe, se recrea inactivo para no perderlas.
  await step("Membresías", errors, async () => {
    const planIds = await localIds("SELECT id FROM membership_plans WHERE gym_id = $1", [gymId]);
    const planNames = await localNameIndex("SELECT id, name FROM membership_plans WHERE gym_id = $1", [gymId]);
    const placeholders: Val[][] = [];
    const rows: Val[][] = [];
    for (const { clientId, id, d } of bySub.memberships) {
      const planId = str(d.planId);
      const start = str(d.startDate);
      const end = str(d.endDate);
      if (!planId || !start || !end) continue;
      if (!planIds.has(planId)) {
        const days = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) || 30);
        let name = str(d.planName) ?? "Plan restaurado";
        if (planNames.has(key(name))) name = `${name} (${planId.slice(-4)})`;
        placeholders.push([planId, gymId, name, days, num(d.price) ?? 0, "Recuperado de la nube", 0]);
        planIds.add(planId);
        planNames.set(key(name), planId);
      }
      rows.push([
        id, gymId, clientId, planId, start, end, num(d.price) ?? 0,
        oneOf(d.paymentStatus, ["PAID", "PENDING"], "PENDING"),
        d.manualStatus == null ? null : oneOf(d.manualStatus, ["SUSPENDED", "CANCELLED"], "SUSPENDED"),
        str(d.method),
      ]);
    }
    summary.membershipPlans += await insertRows(
      "membership_plans",
      ["id", "gym_id", "name", "duration_days", "price", "description", "active"],
      placeholders,
      errors,
      "Planes de membresía",
    );
    summary.memberships = await insertRows(
      "memberships",
      ["id", "gym_id", "client_id", "plan_id", "start_date", "end_date", "price", "payment_status", "manual_status", "method"],
      rows,
      errors,
      "Membresías",
    );
  });
  const membershipIds = await localIds("SELECT id FROM memberships WHERE gym_id = $1", [gymId]);
  const membership = (v: unknown) => {
    const id = str(v);
    return id && membershipIds.has(id) ? id : null;
  };

  await step("Pagos", errors, async () => {
    summary.payments = await insertRows(
      "payments",
      ["id", "gym_id", "client_id", "membership_id", "amount", "date", "method", "status", "concept"],
      bySub.payments
        .filter(({ d }) => str(d.date))
        .map(({ clientId, id, d }) => [
          id, gymId, clientId, membership(d.membershipId), num(d.amount) ?? 0, str(d.date),
          oneOf(d.method, ["CASH", "TRANSFER", "OTHER"], "OTHER"),
          oneOf(d.status, ["PAID", "PENDING"], "PAID"), str(d.concept),
        ]),
      errors,
      "Pagos",
    );
  });

  await step("Asistencias", errors, async () => {
    summary.attendance = await insertRows(
      "attendance",
      ["id", "gym_id", "client_id", "membership_id", "date", "check_in", "check_out", "status", "entry_method", "exit_method"],
      bySub.attendance
        .filter(({ d }) => str(d.date))
        .map(({ clientId, id, d }) => [
          id, gymId, clientId, membership(d.membershipId), str(d.date), str(d.checkIn), str(d.checkOut),
          oneOf(d.status, ["PRESENT", "ABSENT"], "PRESENT"), str(d.entryMethod), str(d.exitMethod),
        ]),
      errors,
      "Asistencias",
    );
  });

  await step("Medidas", errors, async () => {
    summary.measurements = await insertRows(
      "measurements",
      [
        "id", "gym_id", "client_id", "date", "weight", "height", "waist", "chest", "arm",
        "leg", "calf", "hip", "body_fat", "muscle_mass", "notes",
      ],
      bySub.measurements
        .filter(({ d }) => str(d.date))
        .map(({ clientId, id, d }) => [
          id, gymId, clientId, str(d.date), num(d.weight), num(d.height), num(d.waist), num(d.chest),
          num(d.arm), num(d.leg), num(d.calf), num(d.hip), num(d.bodyFat), num(d.muscleMass), str(d.notes),
        ]),
      errors,
      "Medidas",
    );
  });

  await step("Rutinas asignadas", errors, async () => {
    summary.routineAssignments = await insertRows(
      "routine_assignments",
      ["id", "gym_id", "routine_id", "client_id", "start_date", "end_date"],
      bySub.routineAssignments
        .filter(({ d }) => routineIds.has(str(d.routineId) ?? ""))
        .map(({ clientId, id, d }) => [id, gymId, str(d.routineId), clientId, str(d.startDate), str(d.endDate)]),
      errors,
      "Rutinas asignadas",
    );
  });

  await step("Planes asignados", errors, async () => {
    summary.mealPlanAssignments = await insertRows(
      "meal_plan_assignments",
      ["id", "gym_id", "meal_plan_id", "client_id", "start_date", "end_date"],
      bySub.mealPlanAssignments
        .filter(({ d }) => mealPlanIds.has(str(d.mealPlanId) ?? ""))
        .map(({ clientId, id, d }) => [id, gymId, str(d.mealPlanId), clientId, str(d.startDate), str(d.endDate)]),
      errors,
      "Planes asignados",
    );
  });

  await step("Inscripciones a clases", errors, async () => {
    summary.classEnrollments = await insertRows(
      "class_enrollments",
      ["id", "class_id", "client_id", "status"],
      bySub.classEnrollments
        .filter(({ d }) => classIds.has(str(d.classId) ?? ""))
        .map(({ clientId, id, d }) => [
          id, str(d.classId), clientId, oneOf(d.status, ["ENROLLED", "WAITLISTED", "CANCELLED"], "ENROLLED"),
        ]),
      errors,
      "Inscripciones a clases",
    );
  });

  return summary;
}

/** Total de registros restaurados (para decidir si mostrar un aviso). */
export function restoredCount(s: RestoreSummary): number {
  return Object.entries(s).reduce((acc, [k, v]) => (k !== "errors" && typeof v === "number" ? acc + v : acc), 0);
}
