import { describe, expect, it } from "vitest";
import {
  validateRoutineForm,
  validateAssignRoutineForm,
  validateRoutineExerciseForm,
  hasValidationErrors,
} from "./routineValidation";
import {
  emptyRoutineForm,
  emptyAssignRoutineForm,
  emptyRoutineExerciseForm,
  ROUTINE_NAME_GROUPS,
  ROUTINE_NAME_OPTIONS,
} from "@/types/routine";

describe("catálogo de nombres de rutina", () => {
  it("1. incluye la categoría Por distribución", () => {
    expect(ROUTINE_NAME_GROUPS.some((g) => g.label === "Por distribución")).toBe(true);
  });

  it("2. incluye la categoría Por grupo muscular", () => {
    expect(ROUTINE_NAME_GROUPS.some((g) => g.label === "Por grupo muscular")).toBe(true);
  });

  it("3. NO incluye la categoría Por objetivo", () => {
    expect(ROUTINE_NAME_GROUPS.some((g) => g.label === "Por objetivo")).toBe(false);
  });

  it("4. NO incluye la categoría Por nivel", () => {
    expect(ROUTINE_NAME_GROUPS.some((g) => g.label === "Por nivel")).toBe(false);
  });

  it("tiene únicamente esas dos categorías", () => {
    expect(ROUTINE_NAME_GROUPS.map((g) => g.label)).toEqual(["Por distribución", "Por grupo muscular"]);
  });

  it("ningún grupo tiene opciones repetidas dentro de sí mismo", () => {
    for (const group of ROUTINE_NAME_GROUPS) {
      expect(new Set(group.options).size).toBe(group.options.length);
    }
  });

  it("ninguna opción de nivel o de objetivo quedó como nombre de rutina", () => {
    const forbidden = [
      "Hipertrofia",
      "Fuerza",
      "Resistencia",
      "Pérdida de grasa",
      "Acondicionamiento físico",
      "Movilidad",
      "Flexibilidad",
      "Cardio",
      "HIIT",
      "Entrenamiento funcional",
      "Principiante",
      "Intermedio",
      "Avanzado",
    ];
    for (const value of forbidden) {
      expect(ROUTINE_NAME_OPTIONS).not.toContain(value);
    }
  });
});

describe("validateRoutineForm", () => {
  it("1. acepta una rutina válida con nombre del catálogo", () => {
    const input = { ...emptyRoutineForm(), name: "Full Body" };
    const errors = validateRoutineForm(input);
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("3. rechaza una rutina sin nombre", () => {
    const input = { ...emptyRoutineForm(), name: "   " };
    const errors = validateRoutineForm(input);
    expect(errors.name).toBeDefined();
  });

  it("rechaza un nombre que no pertenece al catálogo al crear", () => {
    const input = { ...emptyRoutineForm(), name: "Rutina inventada a mano" };
    const errors = validateRoutineForm(input);
    expect(errors.name).toBeDefined();
  });

  it("acepta un nombre fuera de catálogo si coincide con el valor histórico (rutina antigua)", () => {
    const input = { ...emptyRoutineForm(), name: "Rutina antigua de Juan" };
    const errors = validateRoutineForm(input, { allowedName: "Rutina antigua de Juan" });
    expect(errors.name).toBeUndefined();
  });

  it("rechaza un objetivo que no pertenece al catálogo", () => {
    const input = { ...emptyRoutineForm(), name: "Full Body", description: "Objetivo inventado" };
    const errors = validateRoutineForm(input);
    expect(errors.description).toBeDefined();
  });

  it("acepta el objetivo vacío (es opcional)", () => {
    const input = { ...emptyRoutineForm(), name: "Full Body", description: "" };
    const errors = validateRoutineForm(input);
    expect(errors.description).toBeUndefined();
  });

  it("acepta un objetivo del catálogo", () => {
    const input = {
      ...emptyRoutineForm(),
      name: "Push / Pull / Legs (PPL)",
      description: "Ganancia de masa muscular",
    };
    const errors = validateRoutineForm(input);
    expect(errors.description).toBeUndefined();
  });

  it("acepta un objetivo histórico fuera de catálogo si no fue modificado", () => {
    const input = {
      ...emptyRoutineForm(),
      name: "Full Body",
      description: "Bajar de peso para la boda",
    };
    const errors = validateRoutineForm(input, { allowedDescription: "Bajar de peso para la boda" });
    expect(errors.description).toBeUndefined();
  });

  it("no confunde rutina con objetivo: la misma rutina admite distintos objetivos válidos", () => {
    const a = { ...emptyRoutineForm(), name: "Push / Pull / Legs (PPL)", description: "Fuerza" };
    const b = {
      ...emptyRoutineForm(),
      name: "Push / Pull / Legs (PPL)",
      description: "Ganancia de masa muscular",
    };
    expect(hasValidationErrors(validateRoutineForm(a))).toBe(false);
    expect(hasValidationErrors(validateRoutineForm(b))).toBe(false);
  });
});

describe("validateAssignRoutineForm", () => {
  it("rechaza una asignación sin clientes seleccionados", () => {
    const input = emptyAssignRoutineForm();
    const errors = validateAssignRoutineForm(input);
    expect(errors.clientIds).toBeDefined();
  });

  it("acepta una asignación válida con uno o varios clientes", () => {
    const input = { ...emptyAssignRoutineForm(), clientIds: ["client_1", "client_2", "client_3"] };
    const errors = validateAssignRoutineForm(input);
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("4a. rechaza una fecha de inicio inválida", () => {
    const input = { ...emptyAssignRoutineForm(), clientIds: ["client_1"], startDate: "fecha-invalida" };
    const errors = validateAssignRoutineForm(input);
    expect(errors.startDate).toBeDefined();
  });

  it("4b. rechaza fecha final anterior a la fecha de inicio", () => {
    const input = {
      ...emptyAssignRoutineForm(),
      clientIds: ["client_1"],
      startDate: "2026-09-01",
      endDate: "2026-08-01",
    };
    const errors = validateAssignRoutineForm(input);
    expect(errors.endDate).toBeDefined();
  });

  it("4c. acepta fecha final igual o posterior a la de inicio", () => {
    const input = {
      ...emptyAssignRoutineForm(),
      clientIds: ["client_1"],
      startDate: "2026-09-01",
      endDate: "2026-09-01",
    };
    const errors = validateAssignRoutineForm(input);
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("4d. permite no especificar fecha final (rutina abierta)", () => {
    const input = { ...emptyAssignRoutineForm(), clientIds: ["client_1"], endDate: null };
    const errors = validateAssignRoutineForm(input);
    expect(hasValidationErrors(errors)).toBe(false);
  });
});

describe("validateRoutineExerciseForm", () => {
  it("1. ejercicio tradicional (STRENGTH) válido no genera errores", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", sets: 4, reps: 10, weight: 60, restSeconds: 90 };
    expect(hasValidationErrors(validateRoutineExerciseForm(input, "STRENGTH"))).toBe(false);
  });

  it("rechaza si no se seleccionó ejercicio", () => {
    const input = { ...emptyRoutineExerciseForm() };
    const errors = validateRoutineExerciseForm(input, "STRENGTH");
    expect(errors.exerciseId).toBeDefined();
  });

  it("rechaza series negativas o no enteras en modo fuerza", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", sets: -2 };
    const errors = validateRoutineExerciseForm(input, "STRENGTH");
    expect(errors.sets).toBeDefined();
  });

  it("2. caminadora válida (tiempo + velocidad + inclinación)", () => {
    const input = {
      ...emptyRoutineExerciseForm(),
      exerciseId: "ex2",
      timeValue: 30,
      timeUnit: "MINUTES" as const,
      speedKmh: 6,
      inclinePercent: 8,
    };
    expect(hasValidationErrors(validateRoutineExerciseForm(input, "CARDIO_TIME", "TREADMILL"))).toBe(false);
  });

  it("3. bicicleta válida (tiempo + resistencia, rpm opcional)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex3", timeValue: 20, timeUnit: "MINUTES" as const, resistanceLevel: 5 };
    expect(hasValidationErrors(validateRoutineExerciseForm(input, "CARDIO_TIME", "BIKE"))).toBe(false);
  });

  it("4. remo válido (tiempo + resistencia)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex4", timeValue: 15, timeUnit: "MINUTES" as const, resistanceLevel: 7 };
    expect(hasValidationErrors(validateRoutineExerciseForm(input, "CARDIO_TIME", "ROWER"))).toBe(false);
  });

  it("5. escaladora válida (tiempo + nivel)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex5", timeValue: 15, timeUnit: "MINUTES" as const, resistanceLevel: 8 };
    expect(hasValidationErrors(validateRoutineExerciseForm(input, "CARDIO_TIME", "CLIMBER"))).toBe(false);
  });

  it("cardio genérico válido (tiempo + intensidad cualitativa)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex6", timeValue: 10, timeUnit: "MINUTES" as const, intensityLabel: "Alta" };
    expect(hasValidationErrors(validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC"))).toBe(false);
  });

  it("8. rechaza tiempo faltante en modo cardio", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1" };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC");
    expect(errors.timeValue).toBeDefined();
  });

  it("9. rechaza tiempo negativo", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: -5, timeUnit: "MINUTES" as const, intensityLabel: "Alta" };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC");
    expect(errors.timeValue).toBeDefined();
  });

  it("10. rechaza tiempo cero", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 0, timeUnit: "MINUTES" as const, intensityLabel: "Alta" };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC");
    expect(errors.timeValue).toBeDefined();
  });

  it("rechaza tiempo NaN", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: NaN, timeUnit: "MINUTES" as const, intensityLabel: "Alta" };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC");
    expect(errors.timeValue).toBeDefined();
  });

  it("rechaza tiempo Infinity", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: Infinity, timeUnit: "MINUTES" as const, intensityLabel: "Alta" };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC");
    expect(errors.timeValue).toBeDefined();
  });

  it("rechaza un tiempo absurdo (999999 horas)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 999999, timeUnit: "HOURS" as const, intensityLabel: "Alta" };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC");
    expect(errors.timeValue).toBeDefined();
  });

  it("11. rechaza velocidad inválida en caminadora (cero o negativa)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 30, timeUnit: "MINUTES" as const, speedKmh: 0 };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "TREADMILL");
    expect(errors.speedKmh).toBeDefined();
  });

  it("12. rechaza inclinación inválida en caminadora (negativa)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 30, timeUnit: "MINUTES" as const, speedKmh: 6, inclinePercent: -1 };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "TREADMILL");
    expect(errors.inclinePercent).toBeDefined();
  });

  it("13. rechaza resistencia inválida en bicicleta (cero o negativa)", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 20, timeUnit: "MINUTES" as const, resistanceLevel: 0 };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "BIKE");
    expect(errors.resistanceLevel).toBeDefined();
  });

  it("rechaza RPM fuera de rango en bicicleta", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 20, timeUnit: "MINUTES" as const, resistanceLevel: 5, rpm: 5 };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "BIKE");
    expect(errors.rpm).toBeDefined();
  });

  it("rechaza cardio genérico sin intensidad seleccionada", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 10, timeUnit: "MINUTES" as const };
    const errors = validateRoutineExerciseForm(input, "CARDIO_TIME", "GENERIC");
    expect(errors.intensityLabel).toBeDefined();
  });

  it("modo MOBILITY solo exige tiempo, sin campos de intensidad", () => {
    const input = { ...emptyRoutineExerciseForm(), exerciseId: "ex1", timeValue: 15, timeUnit: "MINUTES" as const };
    expect(hasValidationErrors(validateRoutineExerciseForm(input, "MOBILITY"))).toBe(false);
  });
});
