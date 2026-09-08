import { describe, expect, it } from "vitest";
import { validateClassForm, hasValidationErrors } from "./classValidation";
import { emptyClassBlockExerciseForm, emptyClassForm } from "@/types/class";

describe("validateClassForm", () => {
  it("1. formulario vacío: nombre, tipo y capacidad inválida", () => {
    const input = { ...emptyClassForm("2026-09-07"), name: "", classTypeId: "", capacity: 0 };
    const errors = validateClassForm(input);
    expect(errors.name).toBeDefined();
    expect(errors.classTypeId).toBeDefined();
    expect(errors.capacity).toBeDefined();
  });

  it("2. clase válida: sin errores", () => {
    const input = { ...emptyClassForm("2026-09-07"), name: "Cross Training", classTypeId: "class_type_crossfit" };
    expect(hasValidationErrors(validateClassForm(input))).toBe(false);
  });

  it("3. hora fin igual a hora inicio: inválido", () => {
    const input = {
      ...emptyClassForm("2026-09-07"),
      name: "X",
      classTypeId: "t1",
      startTime: "08:00",
      endTime: "08:00",
    };
    expect(validateClassForm(input).endTime).toBeDefined();
  });

  it("4. hora fin anterior a hora inicio: inválido", () => {
    const input = {
      ...emptyClassForm("2026-09-07"),
      name: "X",
      classTypeId: "t1",
      startTime: "09:00",
      endTime: "08:00",
    };
    expect(validateClassForm(input).endTime).toBeDefined();
  });

  it("5. clientes duplicados en la lista: inválido", () => {
    const input = {
      ...emptyClassForm("2026-09-07"),
      name: "X",
      classTypeId: "t1",
      capacity: 10,
      clientIds: ["c1", "c1"],
    };
    expect(validateClassForm(input).clientIds).toBeDefined();
  });

  it("6. más clientes inscritos que cupo: inválido", () => {
    const input = {
      ...emptyClassForm("2026-09-07"),
      name: "X",
      classTypeId: "t1",
      capacity: 1,
      clientIds: ["c1", "c2"],
    };
    expect(validateClassForm(input).clientIds).toBeDefined();
  });

  it("7. ejercicio repetido dentro del mismo bloque: inválido", () => {
    const input = {
      ...emptyClassForm("2026-09-07"),
      name: "X",
      classTypeId: "t1",
      blocks: [
        {
          id: null,
          name: "WOD",
          blockType: "WOD" as const,
          exercises: [
            { ...emptyClassBlockExerciseForm(), exerciseId: "ex1" },
            { ...emptyClassBlockExerciseForm(), exerciseId: "ex1" },
          ],
        },
      ],
    };
    expect(validateClassForm(input).blocks).toBeDefined();
  });

  it("8. repetir semanal sin días seleccionados: inválido", () => {
    const input = {
      ...emptyClassForm("2026-09-07"),
      name: "X",
      classTypeId: "t1",
      repeat: { frequency: "WEEKLY" as const, weekdays: [], until: "2026-12-30" },
    };
    expect(validateClassForm(input).repeat).toBeDefined();
  });

  it("9. repetir con fecha 'hasta' anterior a la fecha de la clase: inválido", () => {
    const input = {
      ...emptyClassForm("2026-09-07"),
      name: "X",
      classTypeId: "t1",
      repeat: { frequency: "WEEKLY" as const, weekdays: [1], until: "2026-01-01" },
    };
    expect(validateClassForm(input).repeat).toBeDefined();
  });
});
