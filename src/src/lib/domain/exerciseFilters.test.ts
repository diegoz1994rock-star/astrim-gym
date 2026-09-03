import { describe, expect, it } from "vitest";
import { filterExercises } from "./exerciseFilters";
import { DEFAULT_EXERCISE_FILTERS, type ExerciseListItem } from "@/types/exercise";

const EXERCISES: ExerciseListItem[] = [
  {
    id: "e1",
    isGlobal: true,
    name: "Press banca (DEMO)",
    category: "Pecho",
    description: null,
    muscleGroup: "CHEST",
    secondaryMuscles: null,
    exerciseType: "STRENGTH",
    equipment: "Barra y banco",
    level: "INTERMEDIATE",
    instructions: null,
    videoPath: null,
    status: "ACTIVE",
  },
  {
    id: "e2",
    isGlobal: false,
    name: "Curl bíceps",
    category: "Bíceps",
    description: null,
    muscleGroup: "BICEPS",
    secondaryMuscles: null,
    exerciseType: "HYPERTROPHY",
    equipment: "Mancuernas",
    level: "BEGINNER",
    instructions: null,
    videoPath: "https://www.youtube.com/watch?v=ABC123",
    status: "ACTIVE",
  },
  {
    id: "e3",
    isGlobal: false,
    name: "Ejercicio viejo",
    category: null,
    description: null,
    muscleGroup: "LEGS",
    secondaryMuscles: null,
    exerciseType: null,
    equipment: null,
    level: null,
    instructions: null,
    videoPath: null,
    status: "INACTIVE",
  },
];

describe("filterExercises", () => {
  it("5a. sin filtros devuelve todos", () => {
    expect(filterExercises(EXERCISES, DEFAULT_EXERCISE_FILTERS)).toHaveLength(3);
  });

  it("5b. busca por nombre", () => {
    const result = filterExercises(EXERCISES, { ...DEFAULT_EXERCISE_FILTERS, search: "curl" });
    expect(result.map((e) => e.id)).toEqual(["e2"]);
  });

  it("5c. filtra por grupo muscular", () => {
    const result = filterExercises(EXERCISES, { ...DEFAULT_EXERCISE_FILTERS, muscleGroup: "LEGS" });
    expect(result.map((e) => e.id)).toEqual(["e3"]);
  });

  it("5d. filtra por tipo de ejercicio", () => {
    const result = filterExercises(EXERCISES, { ...DEFAULT_EXERCISE_FILTERS, exerciseType: "HYPERTROPHY" });
    expect(result.map((e) => e.id)).toEqual(["e2"]);
  });

  it("5e. filtra por equipamiento", () => {
    const result = filterExercises(EXERCISES, { ...DEFAULT_EXERCISE_FILTERS, equipment: "Mancuernas" });
    expect(result.map((e) => e.id)).toEqual(["e2"]);
  });

  it("7. filtra por estado (mantiene visibles los inactivos si se piden)", () => {
    const result = filterExercises(EXERCISES, { ...DEFAULT_EXERCISE_FILTERS, status: "INACTIVE" });
    expect(result.map((e) => e.id)).toEqual(["e3"]);
  });

  it("8. filtra por categoría", () => {
    const result = filterExercises(EXERCISES, { ...DEFAULT_EXERCISE_FILTERS, category: "Pecho" });
    expect(result.map((e) => e.id)).toEqual(["e1"]);
  });

  it("9. un ejercicio sin categoría no aparece si se filtra por una categoría concreta", () => {
    const result = filterExercises(EXERCISES, { ...DEFAULT_EXERCISE_FILTERS, category: "Bíceps" });
    expect(result.map((e) => e.id)).toEqual(["e2"]);
  });
});
