import type { MealPlanStatus } from "./db";

export type { MealPlanStatus };

// ---- Catálogo de alimentos ----

export type FoodCategory =
  | "PROTEINA"
  | "CARBOHIDRATO"
  | "LEGUMBRE"
  | "VERDURA"
  | "FRUTA"
  | "LACTEO"
  | "GRASA"
  | "BEBIDA"
  | "OTRO";

export type FoodUnit = "g" | "ml" | "unidad" | "porcion" | "cucharada" | "taza";

export interface FoodCategoryOption {
  value: FoodCategory;
  label: string;
}

export interface FoodUnitOption {
  value: FoodUnit;
  label: string;
}

export const FOOD_CATEGORY_OPTIONS: FoodCategoryOption[] = [
  { value: "PROTEINA", label: "Proteína" },
  { value: "CARBOHIDRATO", label: "Carbohidrato" },
  { value: "LEGUMBRE", label: "Legumbre" },
  { value: "VERDURA", label: "Verdura" },
  { value: "FRUTA", label: "Fruta" },
  { value: "LACTEO", label: "Lácteo" },
  { value: "GRASA", label: "Grasa" },
  { value: "BEBIDA", label: "Bebida" },
  { value: "OTRO", label: "Otro" },
];

export const FOOD_UNIT_OPTIONS: FoodUnitOption[] = [
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "unidad", label: "unidad" },
  { value: "porcion", label: "porción" },
  { value: "cucharada", label: "cucharada" },
  { value: "taza", label: "taza" },
];

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = Object.fromEntries(
  FOOD_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<FoodCategory, string>;

export const FOOD_UNIT_LABELS: Record<FoodUnit, string> = Object.fromEntries(
  FOOD_UNIT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<FoodUnit, string>;

export const MEAL_PLAN_STATUS_LABELS: Record<MealPlanStatus, string> = {
  ACTIVE: "Activo",
  FINISHED: "Finalizado",
  INACTIVE: "Inactivo",
};

export interface FoodListItem {
  id: string;
  isGlobal: boolean;
  name: string;
  category: FoodCategory;
  defaultUnit: FoodUnit;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  imageBase64: string | null;
}

// ---- Objetivo del plan ----

export type MealPlanGoal =
  | "PERDIDA_PESO"
  | "MANTENIMIENTO"
  | "GANANCIA_MUSCULAR"
  | "RECOMPOSICION"
  | "OTRO";

export interface MealPlanGoalOption {
  value: MealPlanGoal;
  label: string;
}

export const MEAL_PLAN_GOAL_OPTIONS: MealPlanGoalOption[] = [
  { value: "PERDIDA_PESO", label: "Pérdida de peso" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "GANANCIA_MUSCULAR", label: "Ganancia muscular" },
  { value: "RECOMPOSICION", label: "Recomposición corporal" },
  { value: "OTRO", label: "Otro" },
];

export const MEAL_PLAN_GOAL_LABELS: Record<MealPlanGoal, string> = Object.fromEntries(
  MEAL_PLAN_GOAL_OPTIONS.map((o) => [o.value, o.label]),
) as Record<MealPlanGoal, string>;

// ---- Metas por categoría ----

export type CategoryTargetUnit = "g" | "porciones";

export interface CategoryTargetUnitOption {
  value: CategoryTargetUnit;
  label: string;
}

export const CATEGORY_TARGET_UNIT_OPTIONS: CategoryTargetUnitOption[] = [
  { value: "g", label: "gramos" },
  { value: "porciones", label: "porciones" },
];

export const CATEGORY_TARGET_UNIT_LABELS: Record<CategoryTargetUnit, string> = Object.fromEntries(
  CATEGORY_TARGET_UNIT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<CategoryTargetUnit, string>;

// ---- Plan de alimentación ----

/**
 * Identidad básica del plan: lo mínimo para crearlo. Metas diarias, metas
 * por categoría, alimentos permitidos y reglas se configuran por separado
 * desde MealPlanDetailPage una vez creado.
 */
export interface MealPlanFormInput {
  name: string;
  description: string;
  status: MealPlanStatus;
  goal: MealPlanGoal | null;
}

export function emptyMealPlanForm(): MealPlanFormInput {
  return {
    name: "",
    description: "",
    status: "ACTIVE",
    goal: null,
  };
}

export interface MealPlanListItem {
  id: string;
  name: string;
  description: string | null;
  status: MealPlanStatus;
  goal: MealPlanGoal | null;
  notes: string | null;
  dailyCaloriesTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
  createdAt: string;
  updatedAt: string;
  categoryTargetCount: number;
  allowedFoodCount: number;
  assignmentCount: number;
}

export function mealPlanToFormInput(plan: MealPlanListItem): MealPlanFormInput {
  return {
    name: plan.name,
    description: plan.description ?? "",
    status: plan.status,
    goal: plan.goal,
  };
}

/**
 * Metas diarias del plan: se editan por separado de la identidad básica.
 * `dailyCaloriesTarget` NO se tipea a mano — la UI la calcula sola
 * (proteína×4 + carbohidratos×4 + grasa×9) y la manda ya resuelta acá.
 * `verduraTarget`/`frutaTarget` no son columnas de `meal_plans`: son un
 * atajo de UI sobre `meal_plan_category_targets` (categorías VERDURA/FRUTA)
 * para no obligar al entrenador a ir a una sección aparte por las dos
 * categorías que en la práctica siempre se usan.
 */
export interface MealPlanTargetsFormInput {
  dailyCaloriesTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
  verduraTarget: number | null;
  verduraUnit: CategoryTargetUnit;
  frutaTarget: number | null;
  frutaUnit: CategoryTargetUnit;
}

export function mealPlanToTargetsFormInput(
  plan: MealPlanListItem,
  categoryTargets: CategoryTargetListItem[],
): MealPlanTargetsFormInput {
  const verdura = categoryTargets.find((t) => t.category === "VERDURA");
  const fruta = categoryTargets.find((t) => t.category === "FRUTA");
  return {
    dailyCaloriesTarget: plan.dailyCaloriesTarget,
    dailyProteinTarget: plan.dailyProteinTarget,
    dailyCarbsTarget: plan.dailyCarbsTarget,
    dailyFatTarget: plan.dailyFatTarget,
    verduraTarget: verdura?.targetQuantity ?? null,
    verduraUnit: verdura?.targetUnit ?? "g",
    frutaTarget: fruta?.targetQuantity ?? null,
    frutaUnit: fruta?.targetUnit ?? "porciones",
  };
}

/**
 * Igual que AssignRoutineFormInput: alta en lote a uno o varios clientes a
 * la vez, todos con la misma vigencia. No reemplaza asignaciones existentes.
 */
export interface AssignMealPlanFormInput {
  clientIds: string[];
  startDate: string | null;
  endDate: string | null;
}

export function emptyAssignMealPlanForm(): AssignMealPlanFormInput {
  return {
    clientIds: [],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
  };
}

/** Un cliente asignado a un plan, con su propia vigencia. */
export interface MealPlanAssignmentListItem {
  id: string;
  mealPlanId: string;
  clientId: string;
  clientName: string;
  clientDocument: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

/** Plan de alimentación visto desde un cliente en particular (su propia vigencia). */
export interface ClientMealPlanListItem {
  id: string;
  name: string;
  description: string | null;
  status: MealPlanStatus;
  goal: MealPlanGoal | null;
  notes: string | null;
  dailyCaloriesTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface MealPlanFilters {
  search: string;
  status: "ALL" | MealPlanStatus;
}

export const DEFAULT_MEAL_PLAN_FILTERS: MealPlanFilters = {
  search: "",
  status: "ALL",
};

// ---- Metas por categoría de un plan ----

/** `category` vacío = todavía no seleccionada (fila nueva en el formulario). */
export interface CategoryTargetFormInput {
  category: FoodCategory | "";
  targetQuantity: number | null;
  targetUnit: CategoryTargetUnit;
}

export function emptyCategoryTargetForm(): CategoryTargetFormInput {
  return {
    category: "",
    targetQuantity: null,
    targetUnit: "g",
  };
}

export interface CategoryTargetListItem {
  id: string;
  mealPlanId: string;
  category: FoodCategory;
  targetQuantity: number;
  targetUnit: CategoryTargetUnit;
  sortOrder: number;
}

export function categoryTargetToFormInput(item: CategoryTargetListItem): CategoryTargetFormInput {
  return {
    category: item.category,
    targetQuantity: item.targetQuantity,
    targetUnit: item.targetUnit,
  };
}

// ---- Alimentos permitidos (whitelist) de un plan ----

export interface AllowedFoodListItem {
  id: string;
  mealPlanId: string;
  foodId: string;
  foodName: string;
  category: FoodCategory;
  defaultUnit: FoodUnit;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}
