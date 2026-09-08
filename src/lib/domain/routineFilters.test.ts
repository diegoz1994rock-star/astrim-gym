import { describe, expect, it } from "vitest";
import { filterRoutines } from "./routineFilters";
import { DEFAULT_ROUTINE_FILTERS, type RoutineListItem } from "@/types/routine";

const ROUTINES: RoutineListItem[] = [
  {
    id: "r1",
    name: "Pecho y tríceps",
    description: "Ganancia muscular",
    status: "ACTIVE",
    notes: null,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
    exerciseCount: 3,
    assignmentCount: 2,
  },
  {
    id: "r2",
    name: "Full body",
    description: "Pérdida de grasa",
    status: "FINISHED",
    notes: null,
    createdAt: "2026-06-01",
    updatedAt: "2026-07-01",
    exerciseCount: 5,
    assignmentCount: 0,
  },
  {
    id: "r3",
    name: "Rutina antigua",
    description: null,
    status: "INACTIVE",
    notes: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-02-01",
    exerciseCount: 0,
    assignmentCount: 1,
  },
];

describe("filterRoutines", () => {
  it("7a. sin filtros devuelve todas", () => {
    expect(filterRoutines(ROUTINES, DEFAULT_ROUTINE_FILTERS)).toHaveLength(3);
  });

  it("7c. busca por nombre de rutina", () => {
    const result = filterRoutines(ROUTINES, { ...DEFAULT_ROUTINE_FILTERS, search: "full body" });
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("7d. filtra por estado", () => {
    const result = filterRoutines(ROUTINES, { ...DEFAULT_ROUTINE_FILTERS, status: "FINISHED" });
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("7f. combina nombre + estado", () => {
    const result = filterRoutines(ROUTINES, { search: "antigua", status: "INACTIVE" });
    expect(result.map((r) => r.id)).toEqual(["r3"]);
  });
});
