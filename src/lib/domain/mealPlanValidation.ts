import type {
  AssignMealPlanFormInput,
  CategoryTargetFormInput,
  MealPlanFormInput,
  MealPlanGoal,
  MealPlanTargetsFormInput,
} from "@/types/mealPlan";
import { FOOD_CATEGORY_LABELS, MEAL_PLAN_GOAL_OPTIONS } from "@/types/mealPlan";
import { hasValidationErrors } from "./validation";

export type MealPlanValidationErrors = Partial<Record<keyof MealPlanFormInput, string>>;
export type MealPlanTargetsValidationErrors = Partial<Record<keyof MealPlanTargetsFormInput, string>>;
export type AssignMealPlanValidationErrors = Partial<Record<keyof AssignMealPlanFormInput, string>>;
export { hasValidationErrors };

const VALID_GOALS = new Set<MealPlanGoal>(MEAL_PLAN_GOAL_OPTIONS.map((o) => o.value));

export function validateMealPlanForm(input: MealPlanFormInput): MealPlanValidationErrors {
  const errors: MealPlanValidationErrors = {};

  if (!input.name.trim()) {
    errors.name = "Ingresa el nombre del plan.";
  }

  if (input.goal !== null && !VALID_GOALS.has(input.goal)) {
    errors.goal = "Selecciona un objetivo válido.";
  }

  return errors;
}

const DAILY_TARGET_FIELDS = [
  ["dailyCaloriesTarget", "Las calorías objetivo"],
  ["dailyProteinTarget", "La proteína objetivo"],
  ["dailyCarbsTarget", "Los carbohidratos objetivo"],
  ["dailyFatTarget", "La grasa objetivo"],
  ["verduraTarget", "La meta de verdura"],
  ["frutaTarget", "La meta de fruta"],
] as const;

export function validateMealPlanTargetsForm(input: MealPlanTargetsFormInput): MealPlanTargetsValidationErrors {
  const errors: MealPlanTargetsValidationErrors = {};

  for (const [key, label] of DAILY_TARGET_FIELDS) {
    const value = input[key];
    if (value === null) continue;
    if (!Number.isFinite(value) || value < 0) {
      errors[key] = `${label} debe ser un número válido mayor o igual a 0.`;
    }
  }

  return errors;
}

export function validateAssignMealPlanForm(input: AssignMealPlanFormInput): AssignMealPlanValidationErrors {
  const errors: AssignMealPlanValidationErrors = {};

  if (input.clientIds.length === 0) {
    errors.clientIds = "Selecciona al menos un cliente.";
  }

  const start = input.startDate ? new Date(`${input.startDate}T00:00:00`) : null;
  const end = input.endDate ? new Date(`${input.endDate}T00:00:00`) : null;

  if (input.startDate && start && Number.isNaN(start.getTime())) {
    errors.startDate = "Ingresa una fecha de inicio válida.";
  }

  if (input.endDate && end && Number.isNaN(end.getTime())) {
    errors.endDate = "Ingresa una fecha final válida.";
  } else if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    if (end.getTime() < start.getTime()) {
      errors.endDate = "La fecha final no puede ser anterior a la fecha de inicio.";
    }
  }

  return errors;
}

/**
 * Valida la lista COMPLETA de metas por categoría que se va a persistir
 * (reemplazo total, ver mealPlanRepository.setCategoryTargets): sin
 * categoría repetida y con cantidades positivas. No hay mínimo de filas —
 * una lista vacía es válida (el entrenador puede no trackear categorías).
 * Devuelve el primer error encontrado, o `null` si todo está bien.
 */
export function validateCategoryTargetsList(targets: CategoryTargetFormInput[]): string | null {
  const seen = new Set<string>();

  for (const target of targets) {
    if (!target.category) {
      return "Selecciona una categoría para cada meta.";
    }
    if (seen.has(target.category)) {
      return `Ya hay una meta para "${FOOD_CATEGORY_LABELS[target.category]}": no puede repetirse.`;
    }
    seen.add(target.category);

    if (
      target.targetQuantity === null ||
      !Number.isFinite(target.targetQuantity) ||
      target.targetQuantity <= 0
    ) {
      return `La cantidad para "${FOOD_CATEGORY_LABELS[target.category]}" debe ser un número mayor a 0.`;
    }
  }

  return null;
}
