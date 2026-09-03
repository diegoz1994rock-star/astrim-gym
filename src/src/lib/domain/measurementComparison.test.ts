import { describe, expect, it } from "vitest";
import { compareMeasurements } from "./measurementComparison";
import type { MeasurementListItem } from "@/types/measurement";

function makeMeasurement(overrides: Partial<MeasurementListItem>): MeasurementListItem {
  return {
    id: "m1",
    clientId: "c1",
    date: "2026-08-01",
    weight: null,
    height: null,
    bmi: null,
    waist: null,
    chest: null,
    arm: null,
    leg: null,
    calf: null,
    hip: null,
    bodyFat: null,
    muscleMass: null,
    notes: null,
    ...overrides,
  };
}

describe("compareMeasurements", () => {
  it("7/8. compara dos mediciones históricas reales (no sobrescribe, ambas coexisten)", () => {
    const previous = makeMeasurement({ id: "m1", date: "2026-08-01", weight: 100, height: 1.78 });
    const current = makeMeasurement({ id: "m2", date: "2026-08-15", weight: 98, height: 1.78 });

    const comparison = compareMeasurements(previous, current);

    expect(comparison).not.toBeNull();
    expect(comparison?.previousDate).toBe("2026-08-01");
    expect(comparison?.currentDate).toBe("2026-08-15");
  });

  it("9. calcula correctamente la diferencia de peso: 100kg → 96kg = -4", () => {
    const previous = makeMeasurement({ weight: 100 });
    const current = makeMeasurement({ weight: 96 });
    const comparison = compareMeasurements(previous, current);
    expect(comparison?.weightDelta).toBe(-4);
  });

  it("no muestra cambio si no existe medición anterior", () => {
    const current = makeMeasurement({ weight: 96 });
    expect(compareMeasurements(null, current)).toBeNull();
  });

  it("no calcula un delta si el valor falta en alguna de las dos mediciones", () => {
    const previous = makeMeasurement({ weight: 100, waist: null });
    const current = makeMeasurement({ weight: 96, waist: 90 });
    const comparison = compareMeasurements(previous, current);
    expect(comparison?.weightDelta).toBe(-4);
    expect(comparison?.waistDelta).toBeNull();
  });
});
