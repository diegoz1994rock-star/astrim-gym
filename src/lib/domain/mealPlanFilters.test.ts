import { describe, expect, it } from "vitest";
import { filterMealPlans } from "./mealPlanFilters";
import { DEFAULT_MEAL_PLAN_FILTERS, type MealPlanListItem } from "@/types/mealPlan";

const MEAL_PLANS: MealPlanListItem[] = [
  {
    id: "mp1",
    name: "Plan de definición",
    description: "Déficit calórico",
    status: "ACTIVE",
    goal: "PERDIDA_PESO",
    notes: null,
    dailyCaloriesTarget: 1800,
    dailyProteinTarget: 150,
    dailyCarbsTarget: 150,
    dailyFatTarget: 50,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
    categoryTargetCount: 3,
    allowedFoodCount: 12,
    assignmentCount: 2,
  },
  {
    id: "mp2",
    name: "Plan de volumen",
    description: "Superávit calórico",
    status: "FINISHED",
    goal: "GANANCIA_MUSCULAR",
    notes: null,
    dailyCaloriesTarget: 3000,
    dailyProteinTarget: 180,
    dailyCarbsTarget: 350,
    dailyFatTarget: 90,
    createdAt: "2026-06-01",
    updatedAt: "2026-07-01",
    categoryTargetCount: 0,
    allowedFoodCount: 20,
    assignmentCount: 0,
  },
  {
    id: "mp3",
    name: "Plan antiguo",
    description: null,
    status: "INACTIVE",
    goal: null,
    notes: null,
    dailyCaloriesTarget: null,
    dailyProteinTarget: null,
    dailyCarbsTarget: null,
    dailyFatTarget: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-02-01",
    categoryTargetCount: 0,
    allowedFoodCount: 0,
    assignmentCount: 1,
  },
];

describe("filterMealPlans", () => {
  it("sin filtros devuelve todos", () => {
    expect(filterMealPlans(MEAL_PLANS, DEFAULT_MEAL_PLAN_FILTERS)).toHaveLength(3);
  });

  it("busca por nombre del plan", () => {
    const result = filterMealPlans(MEAL_PLANS, { ...DEFAULT_MEAL_PLAN_FILTERS, search: "volumen" });
    expect(result.map((p) => p.id)).toEqual(["mp2"]);
  });

  it("busca ignorando mayúsculas y acentos", () => {
    const result = filterMealPlans(MEAL_PLANS, { ...DEFAULT_MEAL_PLAN_FILTERS, search: "DEFINICION" });
    expect(result.map((p) => p.id)).toEqual(["mp1"]);
  });

  it("filtra por estado", () => {
    const result = filterMealPlans(MEAL_PLANS, { ...DEFAULT_MEAL_PLAN_FILTERS, status: "FINISHED" });
    expect(result.map((p) => p.id)).toEqual(["mp2"]);
  });

  it("combina nombre + estado", () => {
    const result = filterMealPlans(MEAL_PLANS, { search: "antiguo", status: "INACTIVE" });
    expect(result.map((p) => p.id)).toEqual(["mp3"]);
  });
});
