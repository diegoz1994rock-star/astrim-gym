import { describe, expect, it } from "vitest";
import {
  validateMealPlanForm,
  validateMealPlanTargetsForm,
  validateAssignMealPlanForm,
  validateCategoryTargetsList,
  hasValidationErrors,
} from "./mealPlanValidation";
import { emptyAssignMealPlanForm, emptyMealPlanForm, type CategoryTargetFormInput } from "@/types/mealPlan";

describe("validateMealPlanForm", () => {
  it("acepta un plan válido con solo nombre", () => {
    const input = { ...emptyMealPlanForm(), name: "Plan de definición" };
    expect(hasValidationErrors(validateMealPlanForm(input))).toBe(false);
  });

  it("rechaza un plan sin nombre", () => {
    const input = { ...emptyMealPlanForm(), name: "   " };
    const errors = validateMealPlanForm(input);
    expect(errors.name).toBeDefined();
  });

  it("acepta un objetivo nulo (es opcional)", () => {
    const input = { ...emptyMealPlanForm(), name: "Plan", goal: null };
    expect(hasValidationErrors(validateMealPlanForm(input))).toBe(false);
  });

  it("acepta un objetivo válido", () => {
    const input = { ...emptyMealPlanForm(), name: "Plan", goal: "PERDIDA_PESO" as const };
    expect(hasValidationErrors(validateMealPlanForm(input))).toBe(false);
  });

  it("rechaza un objetivo inválido", () => {
    const input = { ...emptyMealPlanForm(), name: "Plan", goal: "INVALIDO" as never };
    const errors = validateMealPlanForm(input);
    expect(errors.goal).toBeDefined();
  });
});

describe("validateMealPlanTargetsForm", () => {
  const emptyTargets = {
    verduraTarget: null,
    verduraUnit: "g" as const,
    frutaTarget: null,
    frutaUnit: "porciones" as const,
  };

  it("acepta metas diarias nulas (son opcionales)", () => {
    const input = {
      dailyCaloriesTarget: null,
      dailyProteinTarget: null,
      dailyCarbsTarget: null,
      dailyFatTarget: null,
      ...emptyTargets,
    };
    expect(hasValidationErrors(validateMealPlanTargetsForm(input))).toBe(false);
  });

  it("acepta metas diarias válidas", () => {
    const input = {
      dailyCaloriesTarget: 2200,
      dailyProteinTarget: 160,
      dailyCarbsTarget: 220,
      dailyFatTarget: 70,
      ...emptyTargets,
    };
    expect(hasValidationErrors(validateMealPlanTargetsForm(input))).toBe(false);
  });

  it("rechaza calorías objetivo negativas", () => {
    const input = {
      dailyCaloriesTarget: -100,
      dailyProteinTarget: null,
      dailyCarbsTarget: null,
      dailyFatTarget: null,
      ...emptyTargets,
    };
    const errors = validateMealPlanTargetsForm(input);
    expect(errors.dailyCaloriesTarget).toBeDefined();
  });

  it("rechaza proteína objetivo NaN", () => {
    const input = {
      dailyCaloriesTarget: null,
      dailyProteinTarget: NaN,
      dailyCarbsTarget: null,
      dailyFatTarget: null,
      ...emptyTargets,
    };
    const errors = validateMealPlanTargetsForm(input);
    expect(errors.dailyProteinTarget).toBeDefined();
  });
});

describe("validateAssignMealPlanForm", () => {
  it("rechaza una asignación sin clientes seleccionados", () => {
    const input = emptyAssignMealPlanForm();
    const errors = validateAssignMealPlanForm(input);
    expect(errors.clientIds).toBeDefined();
  });

  it("acepta una asignación válida con uno o varios clientes", () => {
    const input = { ...emptyAssignMealPlanForm(), clientIds: ["client_1", "client_2"] };
    expect(hasValidationErrors(validateAssignMealPlanForm(input))).toBe(false);
  });

  it("rechaza una fecha de inicio inválida", () => {
    const input = { ...emptyAssignMealPlanForm(), clientIds: ["client_1"], startDate: "fecha-invalida" };
    const errors = validateAssignMealPlanForm(input);
    expect(errors.startDate).toBeDefined();
  });

  it("rechaza fecha final anterior a la fecha de inicio", () => {
    const input = {
      ...emptyAssignMealPlanForm(),
      clientIds: ["client_1"],
      startDate: "2026-09-01",
      endDate: "2026-08-01",
    };
    const errors = validateAssignMealPlanForm(input);
    expect(errors.endDate).toBeDefined();
  });

  it("permite no especificar fecha final (plan abierto)", () => {
    const input = { ...emptyAssignMealPlanForm(), clientIds: ["client_1"], endDate: null };
    expect(hasValidationErrors(validateAssignMealPlanForm(input))).toBe(false);
  });
});

describe("validateCategoryTargetsList", () => {
  it("acepta una lista vacía (no es obligatorio trackear categorías)", () => {
    expect(validateCategoryTargetsList([])).toBeNull();
  });

  it("acepta una lista válida sin categorías repetidas", () => {
    const targets: CategoryTargetFormInput[] = [
      { category: "PROTEINA", targetQuantity: 180, targetUnit: "g" },
      { category: "FRUTA", targetQuantity: 2, targetUnit: "porciones" },
    ];
    expect(validateCategoryTargetsList(targets)).toBeNull();
  });

  it("rechaza una categoría repetida", () => {
    const targets: CategoryTargetFormInput[] = [
      { category: "PROTEINA", targetQuantity: 180, targetUnit: "g" },
      { category: "PROTEINA", targetQuantity: 100, targetUnit: "g" },
    ];
    expect(validateCategoryTargetsList(targets)).toMatch(/repetirse/);
  });

  it("rechaza una fila sin categoría seleccionada", () => {
    const targets: CategoryTargetFormInput[] = [{ category: "", targetQuantity: 100, targetUnit: "g" }];
    expect(validateCategoryTargetsList(targets)).toMatch(/categoría/);
  });

  it("rechaza una cantidad nula o cero", () => {
    const targets: CategoryTargetFormInput[] = [{ category: "PROTEINA", targetQuantity: null, targetUnit: "g" }];
    expect(validateCategoryTargetsList(targets)).toMatch(/mayor a 0/);

    const zeroTargets: CategoryTargetFormInput[] = [
      { category: "PROTEINA", targetQuantity: 0, targetUnit: "g" },
    ];
    expect(validateCategoryTargetsList(zeroTargets)).toMatch(/mayor a 0/);
  });
});
