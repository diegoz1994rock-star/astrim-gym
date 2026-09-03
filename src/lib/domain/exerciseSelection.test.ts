import { describe, expect, it } from "vitest";
import { resolveEditAttempt } from "./exerciseSelection";
import type { ExerciseListItem } from "@/types/exercise";

function makeExercise(overrides: Partial<ExerciseListItem>): ExerciseListItem {
  return {
    id: "ex1",
    isGlobal: false,
    name: "Ejercicio de prueba",
    category: "Pecho",
    description: null,
    muscleGroup: "CHEST",
    secondaryMuscles: null,
    exerciseType: "STRENGTH",
    equipment: "Barra",
    level: "INTERMEDIATE",
    instructions: null,
    videoPath: null,
    status: "ACTIVE",
    ...overrides,
  };
}

describe("resolveEditAttempt", () => {
  it("7. sin ejercicio seleccionado devuelve no-selection", () => {
    expect(resolveEditAttempt([], null)).toEqual({ kind: "no-selection" });
  });

  it("8/9. con un ejercicio propio seleccionado devuelve ok con ese ejercicio exacto", () => {
    const own = makeExercise({ id: "ex-propio", isGlobal: false });
    const other = makeExercise({ id: "ex-otro", isGlobal: false });
    const result = resolveEditAttempt([other, own], "ex-propio");
    expect(result).toEqual({ kind: "ok", exercise: own });
  });

  it("10/11. el ejercicio devuelto conserva instructions y videoPath tal como están en la lista", () => {
    const withContent = makeExercise({
      id: "ex-con-datos",
      instructions: "Ajuste: ...\n\nMovimiento: ...",
      videoPath: "https://www.youtube.com/watch?v=ABC123",
    });
    const result = resolveEditAttempt([withContent], "ex-con-datos");
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.exercise.instructions).toBe("Ajuste: ...\n\nMovimiento: ...");
      expect(result.exercise.videoPath).toBe("https://www.youtube.com/watch?v=ABC123");
    }
  });

  it("16. un ejercicio global seleccionado también devuelve ok (decisión 2026-08-29: los globales son editables)", () => {
    const global = makeExercise({ id: "ex-global", isGlobal: true });
    expect(resolveEditAttempt([global], "ex-global")).toEqual({ kind: "ok", exercise: global });
  });

  it("17. un id que no pertenece a la lista del gimnasio actual (otro gym) devuelve not-found", () => {
    const own = makeExercise({ id: "ex-propio" });
    expect(resolveEditAttempt([own], "ex-de-otro-gimnasio")).toEqual({ kind: "not-found" });
  });

  it("20. un ejercicio propio desactivado se puede editar igualmente", () => {
    const inactive = makeExercise({ id: "ex-inactivo", isGlobal: false, status: "INACTIVE" });
    const result = resolveEditAttempt([inactive], "ex-inactivo");
    expect(result).toEqual({ kind: "ok", exercise: inactive });
  });
});
