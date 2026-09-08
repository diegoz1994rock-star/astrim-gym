import { describe, expect, it } from "vitest";
import { computeCapacityStatus, sortClassesByStartTime } from "./classFilters";
import type { ClassListItem } from "@/types/class";

function makeClass(overrides: Partial<ClassListItem>): ClassListItem {
  return {
    id: "c1",
    gymId: "g1",
    name: "Clase",
    classTypeId: "t1",
    classTypeName: "Gimnasio",
    trainerId: null,
    trainerName: null,
    date: "2026-09-07",
    startTime: "08:00",
    endTime: "09:00",
    capacity: 15,
    status: "PROGRAMADA",
    description: null,
    notes: null,
    recurrenceGroupId: null,
    enrolledCount: 0,
    ...overrides,
  };
}

describe("sortClassesByStartTime", () => {
  it("1. ordena cronológicamente sin importar el orden de entrada", () => {
    const classes = [
      makeClass({ id: "c2", startTime: "14:00" }),
      makeClass({ id: "c1", startTime: "08:00" }),
      makeClass({ id: "c3", startTime: "18:00" }),
    ];
    expect(sortClassesByStartTime(classes).map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });
});

describe("computeCapacityStatus", () => {
  it("1. muy por debajo del cupo: disponible", () => {
    expect(computeCapacityStatus(5, 15)).toBe("AVAILABLE");
  });

  it("2. a un cupo de llenarse: casi lleno", () => {
    expect(computeCapacityStatus(14, 15)).toBe("ALMOST_FULL");
  });

  it("3. cupo alcanzado: completa", () => {
    expect(computeCapacityStatus(15, 15)).toBe("FULL");
  });

  it("4. cupo cero: completa (nunca disponible)", () => {
    expect(computeCapacityStatus(0, 0)).toBe("FULL");
  });
});
