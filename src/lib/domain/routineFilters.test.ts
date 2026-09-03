import { describe, expect, it } from "vitest";
import { filterRoutines } from "./routineFilters";
import { DEFAULT_ROUTINE_FILTERS, type RoutineListItem } from "@/types/routine";

const ROUTINES: RoutineListItem[] = [
  {
    id: "r1",
    clientId: "c1",
    clientName: "Juan Pérez",
    clientDocument: "1122334455",
    name: "Pecho y tríceps",
    description: "Ganancia muscular",
    startDate: "2026-08-01",
    endDate: null,
    status: "ACTIVE",
    notes: null,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
    exerciseCount: 3,
  },
  {
    id: "r2",
    clientId: "c2",
    clientName: "María Gómez",
    clientDocument: "2233445566",
    name: "Full body",
    description: "Pérdida de grasa",
    startDate: "2026-06-01",
    endDate: "2026-07-01",
    status: "FINISHED",
    notes: null,
    createdAt: "2026-06-01",
    updatedAt: "2026-07-01",
    exerciseCount: 5,
  },
  {
    id: "r3",
    clientId: "c1",
    clientName: "Juan Pérez",
    clientDocument: "1122334455",
    name: "Rutina antigua",
    description: null,
    startDate: "2026-01-01",
    endDate: "2026-02-01",
    status: "INACTIVE",
    notes: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-02-01",
    exerciseCount: 0,
  },
];

describe("filterRoutines", () => {
  it("7a. sin filtros devuelve todas", () => {
    expect(filterRoutines(ROUTINES, DEFAULT_ROUTINE_FILTERS)).toHaveLength(3);
  });

  it("7b. busca por nombre de cliente", () => {
    const result = filterRoutines(ROUTINES, { ...DEFAULT_ROUTINE_FILTERS, search: "maría" });
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("7c. busca por nombre de rutina", () => {
    const result = filterRoutines(ROUTINES, { ...DEFAULT_ROUTINE_FILTERS, search: "full body" });
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("7d. filtra por estado", () => {
    const result = filterRoutines(ROUTINES, { ...DEFAULT_ROUTINE_FILTERS, status: "FINISHED" });
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("7e. filtra por rango de fechas de inicio", () => {
    const result = filterRoutines(ROUTINES, {
      ...DEFAULT_ROUTINE_FILTERS,
      dateFrom: "2026-07-01",
      dateTo: "2026-08-31",
    });
    expect(result.map((r) => r.id)).toEqual(["r1"]);
  });

  it("7f. combina cliente + estado", () => {
    const result = filterRoutines(ROUTINES, {
      search: "juan",
      status: "INACTIVE",
      dateFrom: "",
      dateTo: "",
    });
    expect(result.map((r) => r.id)).toEqual(["r3"]);
  });
});
