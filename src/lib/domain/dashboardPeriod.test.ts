import { describe, expect, it } from "vitest";
import { resolvePeriodRange } from "./dashboardPeriod";

const TODAY = new Date(2026, 7, 30); // 30 de agosto de 2026

describe("resolvePeriodRange", () => {
  it("1. HOY: solo el día actual, anterior es ayer", () => {
    const result = resolvePeriodRange({ kind: "TODAY" }, TODAY);
    expect(result).toEqual({
      start: "2026-08-30",
      end: "2026-08-30",
      previousStart: "2026-08-29",
      previousEnd: "2026-08-29",
    });
  });

  it("2. SEMANA: últimos 7 días, ventana anterior de 7 días sin solaparse", () => {
    const result = resolvePeriodRange({ kind: "WEEK" }, TODAY);
    expect(result.start).toBe("2026-08-24");
    expect(result.end).toBe("2026-08-30");
    expect(result.previousStart).toBe("2026-08-17");
    expect(result.previousEnd).toBe("2026-08-23");
  });

  it("3. MES: mes calendario completo, anterior es el mes calendario previo", () => {
    const result = resolvePeriodRange({ kind: "MONTH" }, TODAY);
    expect(result).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
      previousStart: "2026-07-01",
      previousEnd: "2026-07-31",
    });
  });

  it("4. AÑO: respeta el año pedido, no siempre el actual", () => {
    const result = resolvePeriodRange({ kind: "YEAR", year: 2024 }, TODAY);
    expect(result).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
      previousStart: "2023-01-01",
      previousEnd: "2023-12-31",
    });
  });

  it("5. AÑO sin especificar usa el año de hoy", () => {
    const result = resolvePeriodRange({ kind: "YEAR" }, TODAY);
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-12-31");
  });

  it("6. ÚLTIMOS 3 MESES: incluye el mes actual completo", () => {
    const result = resolvePeriodRange({ kind: "LAST_3_MONTHS" }, TODAY);
    expect(result.start).toBe("2026-06-01");
    expect(result.end).toBe("2026-08-31");
  });

  it("7. ÚLTIMOS 6 MESES", () => {
    const result = resolvePeriodRange({ kind: "LAST_6_MONTHS" }, TODAY);
    expect(result.start).toBe("2026-03-01");
    expect(result.end).toBe("2026-08-31");
  });

  it("8. PERSONALIZADO: calcula un periodo anterior de la misma duración", () => {
    const result = resolvePeriodRange(
      { kind: "CUSTOM", customRange: { start: "2026-01-10", end: "2026-01-20" } },
      TODAY,
    );
    expect(result.start).toBe("2026-01-10");
    expect(result.end).toBe("2026-01-20");
    expect(result.previousEnd).toBe("2026-01-09");
    expect(result.previousStart).toBe("2025-12-30");
  });

  it("9. PERSONALIZADO sin rango lanza error en vez de adivinar fechas", () => {
    expect(() => resolvePeriodRange({ kind: "CUSTOM" }, TODAY)).toThrow();
  });
});
