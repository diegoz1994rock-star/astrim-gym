import { describe, expect, it } from "vitest";
import { computeMovingAverage, computePercentChange, fillWeekDays, fillYearMonths } from "./dashboardMetrics";

describe("computePercentChange", () => {
  it("1. calcula el ejemplo exacto pedido: 7.500.000 → 8.450.000", () => {
    const result = computePercentChange(8_450_000, 7_500_000);
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(12.67, 2);
  });

  it("2. calcula una caída correctamente", () => {
    const result = computePercentChange(4600, 5000);
    expect(result).toBeCloseTo(-8, 5);
  });

  it("3. devuelve null si no hay periodo anterior (0)", () => {
    expect(computePercentChange(100, 0)).toBeNull();
  });

  it("4. devuelve null si el periodo anterior es null/undefined", () => {
    expect(computePercentChange(100, null)).toBeNull();
    expect(computePercentChange(100, undefined)).toBeNull();
  });

  it("5. sin cambio da 0%, no null", () => {
    expect(computePercentChange(500, 500)).toBe(0);
  });
});

describe("fillYearMonths", () => {
  it("6. devuelve los 12 meses del año en orden", () => {
    const result = fillYearMonths(2026, []);
    expect(result).toHaveLength(12);
    expect(result[0].month).toBe("2026-01");
    expect(result[11].month).toBe("2026-12");
  });

  it("7. rellena con $0 real los meses sin pagos, sin inventar valores", () => {
    const result = fillYearMonths(2026, [{ month: "2026-06", total: 210000 }]);
    expect(result.find((r) => r.month === "2026-06")?.total).toBe(210000);
    expect(result.find((r) => r.month === "2026-01")?.total).toBe(0);
    expect(result.find((r) => r.month === "2026-12")?.total).toBe(0);
  });

  it("8. ignora datos de otro año si vinieran por error", () => {
    const result = fillYearMonths(2026, [{ month: "2025-12", total: 999 }]);
    expect(result.every((r) => r.month.startsWith("2026"))).toBe(true);
  });
});

describe("fillWeekDays", () => {
  it("9. devuelve los 7 días empezando en lunes", () => {
    const result = fillWeekDays([]);
    expect(result.map((r) => r.dayLabel)).toEqual([
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ]);
    expect(result.every((r) => r.count === 0)).toBe(true);
  });

  it("10. conserva los conteos reales de los días con datos", () => {
    const result = fillWeekDays([
      { day_label: "Sábado", count: 118 },
      { day_label: "Lunes", count: 52 },
    ]);
    expect(result.find((r) => r.dayLabel === "Sábado")?.count).toBe(118);
    expect(result.find((r) => r.dayLabel === "Lunes")?.count).toBe(52);
    expect(result.find((r) => r.dayLabel === "Martes")?.count).toBe(0);
  });
});

describe("computeMovingAverage", () => {
  it("11. null en los meses sin suficiente historial (ventana de 3)", () => {
    const points = [
      { month: "2026-01", total: 100 },
      { month: "2026-02", total: 200 },
    ];
    const result = computeMovingAverage(points, 3);
    expect(result[0].trend).toBeNull();
    expect(result[1].trend).toBeNull();
  });

  it("12. calcula el promedio real de los últimos N meses", () => {
    const points = [
      { month: "2026-01", total: 100 },
      { month: "2026-02", total: 200 },
      { month: "2026-03", total: 300 },
      { month: "2026-04", total: 600 },
    ];
    const result = computeMovingAverage(points, 3);
    expect(result[2].trend).toBeCloseTo(200, 5);
    expect(result[3].trend).toBeCloseTo(366.6667, 3);
  });
});
