import { collection, getDocs, query, where } from "firebase/firestore";
import { getCloudDb, isCloudConfigured } from "./firebase";
import { currentCloudUser } from "./cloudAuth";
import { getDb } from "../db/client";

/**
 * Restaura desde Firestore los datos "de base" del gimnasio en la SQLite
 * local — para cuando el dueño formatea o pierde la PC, reinstala el panel,
 * inicia sesión con su cuenta de la nube y necesita recuperar SU gente y SUS
 * plantillas.
 *
 * Restaura: entrenadores, ejercicios propios del gimnasio, clientes (con el
 * vínculo a su cuenta de la app), rutinas + sus ejercicios, y planes de
 * alimentación + items + metas por categoría.
 *
 * NO restaura historial ni asignaciones: membresías, pagos, asistencias,
 * medidas, rutinas/planes asignados a un cliente, inscripciones a clases.
 * Eso queda en la nube pero no se baja (decisión de producto).
 *
 * Cada fila entra con `ON CONFLICT(id) DO NOTHING`: no pisa nada que ya
 * exista localmente, así que se puede correr varias veces sin problema.
 */

export interface RestoreSummary {
  trainers: number;
  exercises: number;
  clients: number;
  routines: number;
  routineExercises: number;
  mealPlans: number;
  mealPlanItems: number;
  mealPlanTargets: number;
  errors: string[];
}

type CloudDoc = Record<string, unknown>;
type Val = string | number | null;

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

async function insertRows(table: string, columns: string[], rows: Val[][]): Promise<number> {
  if (rows.length === 0) return 0;
  const db = await getDb();
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const sql =
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ` +
    `ON CONFLICT(id) DO NOTHING`;
  let affected = 0;
  for (const values of rows) {
    const res = await db.execute(sql, values);
    affected += res.rowsAffected ?? 0;
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

export async function restoreFromCloud(gymId: string): Promise<RestoreSummary> {
  if (!isCloudConfigured) {
    throw new Error("La sincronización con la nube no está configurada en este equipo.");
  }
  if (!currentCloudUser()) {
    throw new Error("Iniciá sesión con la cuenta de la nube del gimnasio antes de restaurar.");
  }

  const cloud = getCloudDb();
  const db = await getDb();
  const summary: RestoreSummary = {
    trainers: 0,
    exercises: 0,
    clients: 0,
    routines: 0,
    routineExercises: 0,
    mealPlans: 0,
    mealPlanItems: 0,
    mealPlanTargets: 0,
    errors: [],
  };
  const gymCol = (name: string) => collection(cloud, "gyms", gymId, name);

  // ---- Entrenadores ----
  await step("Entrenadores", summary.errors, async () => {
    const snap = await getDocs(gymCol("trainers"));
    summary.trainers = await insertRows(
      "trainers",
      ["id", "gym_id", "name", "specialty", "status"],
      snap.docs.map((docSnap) => {
        const d = docSnap.data() as CloudDoc;
        return [docSnap.id, gymId, str(d.name) ?? "(sin nombre)", str(d.specialty), str(d.status) ?? "ACTIVE"];
      }),
    );
  });

  // ---- Ejercicios propios del gimnasio ----
  await step("Ejercicios del gimnasio", summary.errors, async () => {
    const snap = await getDocs(gymCol("exercises"));
    summary.exercises = await insertRows(
      "exercises",
      [
        "id", "gym_id", "name", "description", "muscle_group", "secondary_muscles",
        "level", "equipment", "instructions", "common_mistakes", "status",
        "exercise_type", "category",
      ],
      snap.docs.map((docSnap) => {
        const d = docSnap.data() as CloudDoc;
        return [
          docSnap.id, gymId, str(d.name) ?? "(sin nombre)", str(d.description),
          str(d.muscleGroup), str(d.secondaryMuscles), str(d.level), str(d.equipment),
          str(d.instructions), str(d.commonMistakes), str(d.status) ?? "ACTIVE",
          str(d.exerciseType), str(d.category),
        ];
      }),
    );
  });

  // ---- Clientes (+ vínculo con la cuenta de la app) ----
  await step("Clientes", summary.errors, async () => {
    const snap = await getDocs(query(collection(cloud, "clients"), where("gymId", "==", gymId)));
    summary.clients = await insertRows(
      "clients",
      [
        "id", "gym_id", "name", "document", "birth_date", "phone", "email", "gender",
        "goal", "trainer_id", "join_date", "status", "weight", "height", "waist",
        "chest", "arm", "leg", "calf", "hip", "muscle_mass", "cloud_uid",
      ],
      snap.docs.map((docSnap) => {
        const d = docSnap.data() as CloudDoc;
        return [
          docSnap.id, gymId, str(d.name) ?? "(sin nombre)", str(d.document), str(d.birthDate),
          str(d.phone), str(d.email), str(d.gender), str(d.goal), str(d.trainerId),
          str(d.joinDate), str(d.status) ?? "ACTIVE", num(d.weight), num(d.height),
          num(d.waist), num(d.chest), num(d.arm), num(d.leg), num(d.calf), num(d.hip),
          num(d.muscleMass), str(d.cloudUid),
        ];
      }),
    );
  });

  // Mapa nombre -> id de ejercicios locales (globales + del gimnasio ya
  // restaurados), para re-vincular los ejercicios de las rutinas: los de la
  // biblioteca global tienen un id distinto en cada instalación.
  const exByName = new Map<string, string>();
  await step("Índice de ejercicios", summary.errors, async () => {
    const rows = await db.select<{ id: string; name: string }[]>(
      "SELECT id, name FROM exercises WHERE gym_id IS NULL OR gym_id = $1",
      [gymId],
    );
    rows.forEach((r) => exByName.set(r.name.trim().toLowerCase(), r.id));
  });

  // ---- Rutinas (plantillas, sin asignación a cliente) ----
  await step("Rutinas", summary.errors, async () => {
    const snap = await getDocs(gymCol("routines"));
    summary.routines = await insertRows(
      "routines",
      ["id", "gym_id", "name", "description", "status", "notes"],
      snap.docs.map((docSnap) => {
        const d = docSnap.data() as CloudDoc;
        return [docSnap.id, gymId, str(d.name) ?? "(sin nombre)", str(d.description), str(d.status) ?? "ACTIVE", str(d.notes)];
      }),
    );
  });

  // ---- Ejercicios de cada rutina ----
  await step("Ejercicios de las rutinas", summary.errors, async () => {
    const snap = await getDocs(gymCol("routineExercises"));
    const rows: Val[][] = [];
    for (const docSnap of snap.docs) {
      const d = docSnap.data() as CloudDoc;
      const routineId = str(d.routineId);
      if (!routineId) continue;
      // Re-vincula por nombre (cubre biblioteca global) y si no, por el id de la nube.
      const byName = str(d.exerciseName) ? exByName.get(str(d.exerciseName)!.trim().toLowerCase()) : undefined;
      const exerciseId = byName ?? str(d.exerciseId);
      if (!exerciseId) continue;
      rows.push([
        docSnap.id, routineId, exerciseId, num(d.sets), num(d.reps), num(d.weight),
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
    );
  });

  // ---- Planes de alimentación (plantillas) ----
  await step("Planes de alimentación", summary.errors, async () => {
    const snap = await getDocs(gymCol("mealPlans"));
    summary.mealPlans = await insertRows(
      "meal_plans",
      [
        "id", "gym_id", "name", "description", "status", "notes", "goal",
        "daily_calories_target", "daily_protein_target", "daily_carbs_target", "daily_fat_target",
      ],
      snap.docs.map((docSnap) => {
        const d = docSnap.data() as CloudDoc;
        return [
          docSnap.id, gymId, str(d.name) ?? "(sin nombre)", str(d.description),
          str(d.status) ?? "ACTIVE", str(d.notes), str(d.goal),
          num(d.dailyCaloriesTarget), num(d.dailyProteinTarget),
          num(d.dailyCarbsTarget), num(d.dailyFatTarget),
        ];
      }),
    );
  });

  await step("Items de los planes", summary.errors, async () => {
    const snap = await getDocs(gymCol("mealPlanItems"));
    const rows: Val[][] = [];
    for (const docSnap of snap.docs) {
      const d = docSnap.data() as CloudDoc;
      const mealPlanId = str(d.mealPlanId);
      if (!mealPlanId) continue;
      rows.push([
        docSnap.id, mealPlanId, str(d.foodId), str(d.customFoodName),
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
    );
  });

  await step("Metas de los planes", summary.errors, async () => {
    const snap = await getDocs(gymCol("mealPlanCategoryTargets"));
    const rows: Val[][] = [];
    for (const docSnap of snap.docs) {
      const d = docSnap.data() as CloudDoc;
      const mealPlanId = str(d.mealPlanId);
      const category = str(d.category);
      if (!mealPlanId || !category) continue;
      rows.push([
        docSnap.id, mealPlanId, category, num(d.targetQuantity) ?? 0,
        str(d.targetUnit) ?? "g", num(d.sortOrder) ?? 0,
      ]);
    }
    summary.mealPlanTargets = await insertRows(
      "meal_plan_category_targets",
      ["id", "meal_plan_id", "category", "target_quantity", "target_unit", "sort_order"],
      rows,
    );
  });

  return summary;
}
