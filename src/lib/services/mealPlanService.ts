import * as mealPlanRepository from "../repositories/mealPlanRepository";
import * as clientRepository from "../repositories/clientRepository";
import {
  validateMealPlanForm,
  validateMealPlanTargetsForm,
  validateAssignMealPlanForm,
  validateCategoryTargetsList,
  hasValidationErrors,
} from "../domain/mealPlanValidation";
import type {
  AssignMealPlanValidationErrors,
  MealPlanTargetsValidationErrors,
  MealPlanValidationErrors,
} from "../domain/mealPlanValidation";
import type {
  AllowedFoodListItem,
  AssignMealPlanFormInput,
  CategoryTargetFormInput,
  CategoryTargetListItem,
  ClientMealPlanListItem,
  FoodCategory,
  FoodListItem,
  FoodUnit,
  MealPlanAssignmentListItem,
  MealPlanFormInput,
  MealPlanGoal,
  MealPlanListItem,
  MealPlanTargetsFormInput,
} from "@/types/mealPlan";
import type {
  ClientMealPlanRow,
  FoodRow,
  MealPlanAllowedFoodRow,
  MealPlanAssignmentRow,
  MealPlanCategoryTargetRow,
  MealPlanRow,
} from "@/types/db";

export class MealPlanValidationError extends Error {
  constructor(public errors: MealPlanValidationErrors) {
    super("Los datos del plan de alimentación no son válidos.");
  }
}

export class MealPlanTargetsValidationError extends Error {
  constructor(public errors: MealPlanTargetsValidationErrors) {
    super("Las metas diarias no son válidas.");
  }
}

export class CategoryTargetsValidationError extends Error {}

export class AssignMealPlanValidationError extends Error {
  constructor(public errors: AssignMealPlanValidationErrors) {
    super("Los datos de asignación no son válidos.");
  }
}

export class ClientNotInGymError extends Error {
  constructor() {
    super("El cliente seleccionado no pertenece a este gimnasio.");
  }
}

export class FoodNotAvailableError extends Error {
  constructor() {
    super("El alimento seleccionado no está disponible para este gimnasio.");
  }
}

export class MealPlanNotFoundError extends Error {
  constructor() {
    super("El plan de alimentación no existe en este gimnasio.");
  }
}

function mapRowToListItem(row: MealPlanRow): MealPlanListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    goal: row.goal as MealPlanGoal | null,
    notes: row.notes,
    dailyCaloriesTarget: row.daily_calories_target,
    dailyProteinTarget: row.daily_protein_target,
    dailyCarbsTarget: row.daily_carbs_target,
    dailyFatTarget: row.daily_fat_target,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryTargetCount: row.category_target_count,
    allowedFoodCount: row.allowed_food_count,
    assignmentCount: row.assignment_count,
  };
}

function mapClientMealPlanRowToListItem(row: ClientMealPlanRow): ClientMealPlanListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    goal: row.goal as MealPlanGoal | null,
    notes: row.notes,
    dailyCaloriesTarget: row.daily_calories_target,
    dailyProteinTarget: row.daily_protein_target,
    dailyCarbsTarget: row.daily_carbs_target,
    dailyFatTarget: row.daily_fat_target,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

function mapAssignmentRowToListItem(row: MealPlanAssignmentRow): MealPlanAssignmentListItem {
  return {
    id: row.id,
    mealPlanId: row.meal_plan_id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientDocument: row.client_document,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

function mapFoodRowToListItem(row: FoodRow): FoodListItem {
  return {
    id: row.id,
    isGlobal: row.gym_id === null,
    name: row.name,
    category: row.category as FoodCategory,
    defaultUnit: row.default_unit as FoodUnit,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g,
    imageBase64: row.image_base64,
  };
}

function mapCategoryTargetRowToListItem(row: MealPlanCategoryTargetRow): CategoryTargetListItem {
  return {
    id: row.id,
    mealPlanId: row.meal_plan_id,
    category: row.category as FoodCategory,
    targetQuantity: row.target_quantity,
    targetUnit: row.target_unit as CategoryTargetListItem["targetUnit"],
    sortOrder: row.sort_order,
  };
}

function mapAllowedFoodRowToListItem(row: MealPlanAllowedFoodRow): AllowedFoodListItem {
  return {
    id: row.id,
    mealPlanId: row.meal_plan_id,
    foodId: row.food_id,
    foodName: row.food_name,
    category: row.category as FoodCategory,
    defaultUnit: row.default_unit as FoodUnit,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  };
}

/**
 * El cliente NUNCA se valida solo por su ID: siempre se busca con
 * clientRepository.findClientById(gymId, id), que ya filtra por gym_id —
 * mismo mecanismo que routineService.assertClientBelongsToGym.
 */
async function assertClientBelongsToGym(gymId: string, clientId: string): Promise<void> {
  const client = await clientRepository.findClientById(gymId, clientId);
  if (!client) throw new ClientNotInGymError();
}

async function assertFoodAvailable(gymId: string, foodId: string): Promise<void> {
  const food = await mealPlanRepository.findFoodById(gymId, foodId);
  if (!food) throw new FoodNotAvailableError();
}

export async function getMealPlans(gymId: string): Promise<MealPlanListItem[]> {
  const rows = await mealPlanRepository.listMealPlans(gymId);
  return rows.map(mapRowToListItem);
}

export async function getMealPlansByClient(gymId: string, clientId: string): Promise<ClientMealPlanListItem[]> {
  const rows = await mealPlanRepository.listMealPlansByClient(gymId, clientId);
  return rows.map(mapClientMealPlanRowToListItem);
}

export async function getMealPlanById(gymId: string, id: string): Promise<MealPlanListItem | null> {
  const row = await mealPlanRepository.findMealPlanById(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

export async function createMealPlan(gymId: string, input: MealPlanFormInput): Promise<string> {
  const errors = validateMealPlanForm(input);
  if (hasValidationErrors(errors)) throw new MealPlanValidationError(errors);

  const id = crypto.randomUUID();
  await mealPlanRepository.createMealPlan(gymId, id, {
    name: input.name.trim(),
    description: input.description.trim() || null,
    status: input.status,
    goal: input.goal,
  });
  return id;
}

export async function updateMealPlan(
  gymId: string,
  id: string,
  input: MealPlanFormInput,
): Promise<void> {
  const current = await mealPlanRepository.findMealPlanById(gymId, id);
  if (!current) throw new MealPlanNotFoundError();

  const errors = validateMealPlanForm(input);
  if (hasValidationErrors(errors)) throw new MealPlanValidationError(errors);

  await mealPlanRepository.updateMealPlanDetails(gymId, id, {
    name: input.name.trim(),
    description: input.description.trim() || null,
    status: input.status,
    goal: input.goal,
  });
}

/**
 * Guarda las metas diarias (calorías/macros, en `meal_plans`) y, en el mismo
 * paso, las metas de Verdura/Fruta que viven como categorías
 * (`meal_plan_category_targets`) — ver el comentario de
 * `MealPlanTargetsFormInput`. Preserva cualquier otra categoría con meta
 * que no sea VERDURA/FRUTA (no las gestiona este formulario).
 */
export async function updateMealPlanTargets(
  gymId: string,
  id: string,
  input: MealPlanTargetsFormInput,
): Promise<void> {
  const current = await mealPlanRepository.findMealPlanById(gymId, id);
  if (!current) throw new MealPlanNotFoundError();

  const errors = validateMealPlanTargetsForm(input);
  if (hasValidationErrors(errors)) throw new MealPlanTargetsValidationError(errors);

  await mealPlanRepository.updateMealPlanTargets(gymId, id, input);

  const existing = await mealPlanRepository.listCategoryTargets(id);
  const otherCategories = existing
    .filter((row) => row.category !== "VERDURA" && row.category !== "FRUTA")
    .map((row) => ({
      category: row.category as FoodCategory,
      targetQuantity: row.target_quantity,
      targetUnit: row.target_unit as CategoryTargetListItem["targetUnit"],
    }));
  const nextCategoryTargets: CategoryTargetFormInput[] = [
    ...otherCategories,
    ...(input.verduraTarget !== null
      ? [{ category: "VERDURA" as FoodCategory, targetQuantity: input.verduraTarget, targetUnit: input.verduraUnit }]
      : []),
    ...(input.frutaTarget !== null
      ? [{ category: "FRUTA" as FoodCategory, targetQuantity: input.frutaTarget, targetUnit: input.frutaUnit }]
      : []),
  ];
  const categoryErrors = validateCategoryTargetsList(nextCategoryTargets);
  if (categoryErrors) throw new CategoryTargetsValidationError(categoryErrors);
  await mealPlanRepository.setCategoryTargets(
    id,
    nextCategoryTargets.map((t) => ({
      category: t.category as string,
      targetQuantity: t.targetQuantity as number,
      targetUnit: t.targetUnit,
    })),
  );
}

/** `notes`: relabeled en la UI como "Reglas y recomendaciones". Texto libre, sin validación de formato. */
export async function updateMealPlanNotes(gymId: string, id: string, notes: string): Promise<void> {
  const current = await mealPlanRepository.findMealPlanById(gymId, id);
  if (!current) throw new MealPlanNotFoundError();

  await mealPlanRepository.updateMealPlanNotes(gymId, id, notes.trim() || null);
}

export async function deleteMealPlan(gymId: string, id: string): Promise<void> {
  const plan = await mealPlanRepository.findMealPlanById(gymId, id);
  if (!plan) throw new MealPlanNotFoundError();

  await mealPlanRepository.deleteMealPlan(gymId, id);
}

// ---- Asignaciones ----

export async function getMealPlanAssignments(
  gymId: string,
  mealPlanId: string,
): Promise<MealPlanAssignmentListItem[]> {
  const plan = await mealPlanRepository.findMealPlanById(gymId, mealPlanId);
  if (!plan) throw new MealPlanNotFoundError();

  const rows = await mealPlanRepository.listAssignmentsByMealPlan(mealPlanId);
  return rows.map(mapAssignmentRowToListItem);
}

/**
 * Asigna un plan ya creado a uno o varios clientes a la vez, todos con la
 * misma vigencia. Es un alta en lote: no reemplaza asignaciones ya
 * existentes, así que se puede llamar varias veces para ir sumando
 * clientes sin re-crear el plan.
 */
export async function assignMealPlanClients(
  gymId: string,
  id: string,
  input: AssignMealPlanFormInput,
): Promise<void> {
  const current = await mealPlanRepository.findMealPlanById(gymId, id);
  if (!current) throw new MealPlanNotFoundError();

  const errors = validateAssignMealPlanForm(input);
  if (hasValidationErrors(errors)) throw new AssignMealPlanValidationError(errors);

  for (const clientId of input.clientIds) {
    await assertClientBelongsToGym(gymId, clientId);
  }

  for (const clientId of input.clientIds) {
    await mealPlanRepository.upsertMealPlanAssignment(gymId, id, {
      clientId,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  }
}

export async function removeMealPlanAssignment(
  gymId: string,
  mealPlanId: string,
  assignmentId: string,
): Promise<void> {
  const plan = await mealPlanRepository.findMealPlanById(gymId, mealPlanId);
  if (!plan) throw new MealPlanNotFoundError();

  await mealPlanRepository.removeMealPlanAssignment(mealPlanId, assignmentId);
}

// ---- Catálogo de alimentos ----

export async function getFoods(gymId: string): Promise<FoodListItem[]> {
  const rows = await mealPlanRepository.listFoods(gymId);
  return rows.map(mapFoodRowToListItem);
}

// ---- Metas por categoría del plan ----

export async function getCategoryTargets(gymId: string, mealPlanId: string): Promise<CategoryTargetListItem[]> {
  const plan = await mealPlanRepository.findMealPlanById(gymId, mealPlanId);
  if (!plan) throw new MealPlanNotFoundError();

  const rows = await mealPlanRepository.listCategoryTargets(mealPlanId);
  return rows.map(mapCategoryTargetRowToListItem);
}

/**
 * Reemplazo total de las metas por categoría del plan (ver
 * mealPlanRepository.setCategoryTargets): la UI mantiene la lista completa
 * en memoria y llama acá cada vez que agrega, edita o quita una fila.
 */
export async function setCategoryTargets(
  gymId: string,
  mealPlanId: string,
  targets: CategoryTargetFormInput[],
): Promise<void> {
  const plan = await mealPlanRepository.findMealPlanById(gymId, mealPlanId);
  if (!plan) throw new MealPlanNotFoundError();

  const validationError = validateCategoryTargetsList(targets);
  if (validationError) throw new CategoryTargetsValidationError(validationError);

  await mealPlanRepository.setCategoryTargets(
    mealPlanId,
    targets.map((t) => ({
      category: t.category as string,
      targetQuantity: t.targetQuantity as number,
      targetUnit: t.targetUnit,
    })),
  );
}

// ---- Alimentos permitidos (whitelist) del plan ----

export async function getAllowedFoods(gymId: string, mealPlanId: string): Promise<AllowedFoodListItem[]> {
  const plan = await mealPlanRepository.findMealPlanById(gymId, mealPlanId);
  if (!plan) throw new MealPlanNotFoundError();

  const rows = await mealPlanRepository.listAllowedFoods(mealPlanId);
  return rows.map(mapAllowedFoodRowToListItem);
}

/**
 * Reemplazo total de la whitelist del plan: la UI mantiene el set completo
 * de foodIds permitidos y llama acá cada vez que el entrenador tilda/destilda
 * un alimento.
 */
export async function setAllowedFoods(gymId: string, mealPlanId: string, foodIds: string[]): Promise<void> {
  const plan = await mealPlanRepository.findMealPlanById(gymId, mealPlanId);
  if (!plan) throw new MealPlanNotFoundError();

  const uniqueIds = Array.from(new Set(foodIds));
  for (const foodId of uniqueIds) {
    await assertFoodAvailable(gymId, foodId);
  }

  await mealPlanRepository.setAllowedFoods(mealPlanId, uniqueIds);
}
