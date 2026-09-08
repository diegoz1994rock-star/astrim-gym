import { getDb } from "../db/client";
import type {
  ClientMealPlanRow,
  FoodRow,
  MealPlanAllowedFoodRow,
  MealPlanAssignmentRow,
  MealPlanCategoryTargetRow,
  MealPlanRow,
  MealPlanStatus,
} from "@/types/db";

// ---- Planes de alimentación ----

const MEAL_PLAN_SELECT = `
  SELECT
    mp.id, mp.gym_id, mp.trainer_id, mp.name, mp.description, mp.status, mp.goal, mp.notes,
    mp.daily_calories_target, mp.daily_protein_target, mp.daily_carbs_target, mp.daily_fat_target,
    mp.created_at, mp.updated_at,
    (SELECT COUNT(*) FROM meal_plan_category_targets t WHERE t.meal_plan_id = mp.id) AS category_target_count,
    (SELECT COUNT(*) FROM meal_plan_allowed_foods f WHERE f.meal_plan_id = mp.id) AS allowed_food_count,
    (SELECT COUNT(*) FROM meal_plan_assignments mpa WHERE mpa.meal_plan_id = mp.id) AS assignment_count
  FROM meal_plans mp
`;

export async function listMealPlans(gymId: string): Promise<MealPlanRow[]> {
  const db = await getDb();
  return db.select<MealPlanRow[]>(
    `${MEAL_PLAN_SELECT} WHERE mp.gym_id = $1 ORDER BY mp.created_at DESC`,
    [gymId],
  );
}

/** Planes asignados a un cliente, cada uno con la vigencia de SU asignación. */
export async function listMealPlansByClient(gymId: string, clientId: string): Promise<ClientMealPlanRow[]> {
  const db = await getDb();
  return db.select<ClientMealPlanRow[]>(
    `SELECT mp.id, mp.name, mp.description, mp.status, mp.goal, mp.notes,
       mp.daily_calories_target, mp.daily_protein_target, mp.daily_carbs_target, mp.daily_fat_target,
       mpa.start_date, mpa.end_date
     FROM meal_plan_assignments mpa
     JOIN meal_plans mp ON mp.id = mpa.meal_plan_id
     WHERE mpa.client_id = $1 AND mp.gym_id = $2
     ORDER BY mpa.created_at DESC`,
    [clientId, gymId],
  );
}

export async function findMealPlanById(gymId: string, id: string): Promise<MealPlanRow | null> {
  const db = await getDb();
  const rows = await db.select<MealPlanRow[]>(
    `${MEAL_PLAN_SELECT} WHERE mp.gym_id = $1 AND mp.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

export interface CreateMealPlanInput {
  name: string;
  description: string | null;
  status: MealPlanStatus;
  goal: string | null;
}

/**
 * El plan nace con solo su identidad básica (nombre/objetivo/estado/
 * descripción): sin metas, sin categorías, sin alimentos permitidos, sin
 * clientes. Todo eso se configura por separado una vez creado, desde
 * MealPlanDetailPage.
 */
export async function createMealPlan(
  gymId: string,
  id: string,
  input: CreateMealPlanInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO meal_plans (id, gym_id, name, description, status, goal)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, gymId, input.name, input.description, input.status, input.goal],
  );
}

/** Solo identidad básica: no toca metas diarias, notas, categorías ni alimentos permitidos. */
export async function updateMealPlanDetails(
  gymId: string,
  id: string,
  input: CreateMealPlanInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE meal_plans SET
       name = $1, description = $2, status = $3, goal = $4, updated_at = datetime('now')
     WHERE id = $5 AND gym_id = $6`,
    [input.name, input.description, input.status, input.goal, id, gymId],
  );
}

export interface MealPlanTargetsInput {
  dailyCaloriesTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
}

export async function updateMealPlanTargets(
  gymId: string,
  id: string,
  input: MealPlanTargetsInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE meal_plans SET
       daily_calories_target = $1, daily_protein_target = $2, daily_carbs_target = $3, daily_fat_target = $4,
       updated_at = datetime('now')
     WHERE id = $5 AND gym_id = $6`,
    [
      input.dailyCaloriesTarget,
      input.dailyProteinTarget,
      input.dailyCarbsTarget,
      input.dailyFatTarget,
      id,
      gymId,
    ],
  );
}

/** `notes`: las "Reglas y recomendaciones" del plan, texto libre. */
export async function updateMealPlanNotes(gymId: string, id: string, notes: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE meal_plans SET notes = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [notes, id, gymId],
  );
}

/**
 * Borra el plan y todo lo que solo tiene sentido junto a él: sus metas por
 * categoría, su whitelist de alimentos permitidos y sus asignaciones a
 * clientes. Los hijos se borran primero para que los triggers de outbox de
 * cada tabla puedan resolver `gym_id` vía el plan padre antes de que
 * desaparezca. No toca a los clientes ni al catálogo de alimentos en sí.
 */
export async function deleteMealPlan(gymId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM meal_plan_category_targets WHERE meal_plan_id = $1`, [id]);
  await db.execute(`DELETE FROM meal_plan_allowed_foods WHERE meal_plan_id = $1`, [id]);
  await db.execute(`DELETE FROM meal_plan_assignments WHERE meal_plan_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM meal_plans WHERE id = $1 AND gym_id = $2`, [id, gymId]);
}

// ---- Catálogo de alimentos ----

const FOOD_SELECT = `
  SELECT id, gym_id, name, category, default_unit,
         calories_kcal, protein_g, carbs_g, fat_g, fiber_g, image_base64, created_at, updated_at
  FROM foods
`;

/** Catálogo completo: globales (gym_id NULL) + propios de este gimnasio. */
export async function listFoods(gymId: string): Promise<FoodRow[]> {
  const db = await getDb();
  return db.select<FoodRow[]>(
    `${FOOD_SELECT} WHERE gym_id IS NULL OR gym_id = $1
     ORDER BY category COLLATE NOCASE ASC, name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function findFoodById(gymId: string, id: string): Promise<FoodRow | null> {
  const db = await getDb();
  const rows = await db.select<FoodRow[]>(
    `${FOOD_SELECT} WHERE id = $1 AND (gym_id IS NULL OR gym_id = $2) LIMIT 1`,
    [id, gymId],
  );
  return rows[0] ?? null;
}

export interface CreateFoodInput {
  name: string;
  category: string;
  defaultUnit: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

/** Los alimentos creados desde este módulo siempre quedan asociados al gimnasio actual (nunca globales). */
export async function createCustomFood(gymId: string, id: string, input: CreateFoodInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id,
      gymId,
      input.name,
      input.category,
      input.defaultUnit,
      input.caloriesKcal,
      input.proteinG,
      input.carbsG,
      input.fatG,
      input.fiberG,
    ],
  );
}

/** `gym_id = $10` impide editar tanto el catálogo global como el de otro gimnasio. */
export async function updateCustomFood(gymId: string, id: string, input: CreateFoodInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE foods SET
       name = $1, category = $2, default_unit = $3,
       calories_kcal = $4, protein_g = $5, carbs_g = $6, fat_g = $7, fiber_g = $8,
       updated_at = datetime('now')
     WHERE id = $9 AND gym_id = $10`,
    [
      input.name,
      input.category,
      input.defaultUnit,
      input.caloriesKcal,
      input.proteinG,
      input.carbsG,
      input.fatG,
      input.fiberG,
      id,
      gymId,
    ],
  );
}

export async function deleteCustomFood(gymId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM foods WHERE id = $1 AND gym_id = $2`, [id, gymId]);
}

// ---- Metas por categoría del plan ----

const CATEGORY_TARGET_SELECT = `
  SELECT id, meal_plan_id, category, target_quantity, target_unit, sort_order, created_at, updated_at
  FROM meal_plan_category_targets
`;

export async function listCategoryTargets(mealPlanId: string): Promise<MealPlanCategoryTargetRow[]> {
  const db = await getDb();
  return db.select<MealPlanCategoryTargetRow[]>(
    `${CATEGORY_TARGET_SELECT} WHERE meal_plan_id = $1 ORDER BY sort_order ASC, category COLLATE NOCASE ASC`,
    [mealPlanId],
  );
}

export interface CategoryTargetInput {
  category: string;
  targetQuantity: number;
  targetUnit: string;
}

/**
 * Reemplaza TODAS las metas por categoría del plan por la lista recibida:
 * borra las categorías que ya no están, y hace upsert (por
 * idx_meal_plan_category_targets_unique) del resto preservando su id si ya
 * existía. `sort_order` queda como la posición en la lista recibida, así el
 * entrenador controla el orden de despliegue. Sin transacción explícita
 * (el cliente SQL de esta app no expone una): mismo patrón secuencial que
 * el resto del repo (ver upsertRoutineAssignment / addRoutineExercise).
 */
export async function setCategoryTargets(mealPlanId: string, targets: CategoryTargetInput[]): Promise<void> {
  const db = await getDb();

  if (targets.length === 0) {
    await db.execute(`DELETE FROM meal_plan_category_targets WHERE meal_plan_id = $1`, [mealPlanId]);
    return;
  }

  const categories = targets.map((t) => t.category);
  const placeholders = categories.map((_, i) => `$${i + 2}`).join(", ");
  await db.execute(
    `DELETE FROM meal_plan_category_targets WHERE meal_plan_id = $1 AND category NOT IN (${placeholders})`,
    [mealPlanId, ...categories],
  );

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    await db.execute(
      `INSERT INTO meal_plan_category_targets (id, meal_plan_id, category, target_quantity, target_unit, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (meal_plan_id, category) DO UPDATE SET
         target_quantity = excluded.target_quantity, target_unit = excluded.target_unit,
         sort_order = excluded.sort_order, updated_at = datetime('now')`,
      [crypto.randomUUID(), mealPlanId, target.category, target.targetQuantity, target.targetUnit, i],
    );
  }
}

// ---- Alimentos permitidos (whitelist) del plan ----

const ALLOWED_FOOD_SELECT = `
  SELECT maf.id, maf.meal_plan_id, maf.food_id, f.name AS food_name, f.category AS category,
         f.default_unit AS default_unit, f.calories_kcal AS calories_kcal, f.protein_g AS protein_g,
         f.carbs_g AS carbs_g, f.fat_g AS fat_g, maf.created_at
  FROM meal_plan_allowed_foods maf
  JOIN foods f ON f.id = maf.food_id
`;

export async function listAllowedFoods(mealPlanId: string): Promise<MealPlanAllowedFoodRow[]> {
  const db = await getDb();
  return db.select<MealPlanAllowedFoodRow[]>(
    `${ALLOWED_FOOD_SELECT} WHERE maf.meal_plan_id = $1 ORDER BY f.category COLLATE NOCASE ASC, f.name COLLATE NOCASE ASC`,
    [mealPlanId],
  );
}

/**
 * Reemplaza TODA la whitelist del plan por la lista de foodIds recibida:
 * borra los que ya no están y agrega los nuevos (idx_meal_plan_allowed_foods_unique
 * evita duplicados; no hay campos propios que actualizar, así que un
 * `DO NOTHING` alcanza). Mismo patrón de reemplazo total que setCategoryTargets.
 */
export async function setAllowedFoods(mealPlanId: string, foodIds: string[]): Promise<void> {
  const db = await getDb();

  if (foodIds.length === 0) {
    await db.execute(`DELETE FROM meal_plan_allowed_foods WHERE meal_plan_id = $1`, [mealPlanId]);
    return;
  }

  const placeholders = foodIds.map((_, i) => `$${i + 2}`).join(", ");
  await db.execute(
    `DELETE FROM meal_plan_allowed_foods WHERE meal_plan_id = $1 AND food_id NOT IN (${placeholders})`,
    [mealPlanId, ...foodIds],
  );

  for (const foodId of foodIds) {
    await db.execute(
      `INSERT INTO meal_plan_allowed_foods (id, meal_plan_id, food_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (meal_plan_id, food_id) DO NOTHING`,
      [crypto.randomUUID(), mealPlanId, foodId],
    );
  }
}

// ---- Asignaciones (cliente + vigencia) ----

const MEAL_PLAN_ASSIGNMENT_SELECT = `
  SELECT mpa.id, mpa.meal_plan_id, mpa.client_id, c.name AS client_name, c.document AS client_document,
         mpa.start_date, mpa.end_date, mpa.created_at
  FROM meal_plan_assignments mpa
  JOIN clients c ON c.id = mpa.client_id
`;

export async function listAssignmentsByMealPlan(mealPlanId: string): Promise<MealPlanAssignmentRow[]> {
  const db = await getDb();
  return db.select<MealPlanAssignmentRow[]>(
    `${MEAL_PLAN_ASSIGNMENT_SELECT} WHERE mpa.meal_plan_id = $1 ORDER BY c.name COLLATE NOCASE ASC`,
    [mealPlanId],
  );
}

export interface AssignMealPlanInput {
  clientId: string;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Alta o renovación de UNA asignación cliente-plan. idx_meal_plan_assignments_unique
 * (meal_plan_id, client_id) hace que reasignar al mismo cliente solo actualice
 * sus fechas en vez de duplicar la fila.
 */
export async function upsertMealPlanAssignment(
  gymId: string,
  mealPlanId: string,
  input: AssignMealPlanInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO meal_plan_assignments (id, gym_id, meal_plan_id, client_id, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (meal_plan_id, client_id) DO UPDATE SET
       start_date = excluded.start_date, end_date = excluded.end_date, updated_at = datetime('now')`,
    [crypto.randomUUID(), gymId, mealPlanId, input.clientId, input.startDate, input.endDate],
  );
}

export async function removeMealPlanAssignment(mealPlanId: string, assignmentId: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM meal_plan_assignments WHERE id = $1 AND meal_plan_id = $2`, [
    assignmentId,
    mealPlanId,
  ]);
}
