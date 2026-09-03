import { describe, expect, it } from "vitest";
import {
  validateExerciseForm,
  hasValidationErrors,
  namesAreEqualIgnoringCase,
} from "./exerciseValidation";
import { emptyExerciseForm } from "@/types/exercise";

describe("validateExerciseForm", () => {
  it("1. acepta un ejercicio válido", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca" };
    expect(hasValidationErrors(validateExerciseForm(input))).toBe(false);
  });

  it("2. rechaza un ejercicio sin nombre", () => {
    const input = { ...emptyExerciseForm(), name: "   " };
    const errors = validateExerciseForm(input);
    expect(errors.name).toBeDefined();
  });

  it("rechaza un nombre demasiado largo", () => {
    const input = { ...emptyExerciseForm(), name: "a".repeat(200) };
    const errors = validateExerciseForm(input);
    expect(errors.name).toBeDefined();
  });

  it("acepta sin categoría (es opcional)", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", category: null };
    expect(hasValidationErrors(validateExerciseForm(input))).toBe(false);
  });

  it("acepta una categoría del catálogo", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", category: "Pecho" };
    expect(hasValidationErrors(validateExerciseForm(input))).toBe(false);
  });

  it("rechaza una categoría que no pertenece al catálogo", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", category: "Categoría inventada" };
    const errors = validateExerciseForm(input);
    expect(errors.category).toBeDefined();
  });

  it("acepta una categoría histórica fuera de catálogo si no fue modificada", () => {
    const input = { ...emptyExerciseForm(), name: "Ejercicio viejo", category: "Categoría antigua" };
    const errors = validateExerciseForm(input, { allowedCategory: "Categoría antigua" });
    expect(errors.category).toBeUndefined();
  });

  it("1. acepta un ejercicio sin video (es opcional)", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", videoPath: "" };
    expect(hasValidationErrors(validateExerciseForm(input))).toBe(false);
  });

  it("6. una URL vacía (solo espacios) es válida", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", videoPath: "   " };
    expect(validateExerciseForm(input).videoPath).toBeUndefined();
  });

  it("2. acepta un ejercicio con una URL de video válida", () => {
    const input = {
      ...emptyExerciseForm(),
      name: "Apertura con poleas",
      videoPath: "https://www.youtube.com/watch?v=ABC123",
    };
    expect(hasValidationErrors(validateExerciseForm(input))).toBe(false);
  });

  it("7. rechaza una URL de video inválida", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", videoPath: "no es una url" };
    const errors = validateExerciseForm(input);
    expect(errors.videoPath).toBeDefined();
  });

  it("rechaza esquemas no soportados (javascript:, data:)", () => {
    const input1 = { ...emptyExerciseForm(), name: "Press banca", videoPath: "javascript:alert(1)" };
    expect(validateExerciseForm(input1).videoPath).toBeDefined();
  });

  it("acepta un ejercicio sin instrucciones (son opcionales)", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", instructions: "" };
    expect(hasValidationErrors(validateExerciseForm(input))).toBe(false);
  });

  it("acepta instrucciones largas con varias líneas", () => {
    const instructions = [
      "Ajuste: coloca las poleas a la altura de los hombros.",
      "Postura: da un paso al frente para tensar los cables.",
      "Movimiento: abre los brazos de forma controlada.",
    ].join("\n\n");
    const input = { ...emptyExerciseForm(), name: "Apertura con poleas", instructions };
    expect(hasValidationErrors(validateExerciseForm(input))).toBe(false);
  });

  it("rechaza instrucciones absurdamente largas", () => {
    const input = { ...emptyExerciseForm(), name: "Press banca", instructions: "a".repeat(5000) };
    const errors = validateExerciseForm(input);
    expect(errors.instructions).toBeDefined();
  });
});

describe("namesAreEqualIgnoringCase (regla de duplicados, punto 4)", () => {
  it("4. 'Press banca' y 'PRESS BANCA' se consideran el mismo nombre", () => {
    expect(namesAreEqualIgnoringCase("Press banca", "PRESS BANCA")).toBe(true);
  });

  it("ignora espacios sobrantes", () => {
    expect(namesAreEqualIgnoringCase("  Curl biceps  ", "curl biceps")).toBe(true);
  });

  it("nombres realmente distintos no se consideran iguales", () => {
    expect(namesAreEqualIgnoringCase("Press banca", "Press militar")).toBe(false);
  });
});
