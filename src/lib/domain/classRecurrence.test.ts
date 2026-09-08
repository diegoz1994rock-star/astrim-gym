import { describe, expect, it } from "vitest";
import { generateRecurrenceDates } from "./classRecurrence";

describe("generateRecurrenceDates", () => {
  it("1. diaria: incluye cada día entre inicio y hasta, ambos incluidos", () => {
    const dates = generateRecurrenceDates("2026-09-07", { frequency: "DAILY", weekdays: [], until: "2026-09-10" });
    expect(dates).toEqual(["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"]);
  });

  it("2. semanal: solo los días de semana seleccionados (lunes = 1)", () => {
    // 2026-09-07 es lunes; hasta 2026-09-21 hay 3 lunes.
    const dates = generateRecurrenceDates("2026-09-07", { frequency: "WEEKLY", weekdays: [1], until: "2026-09-21" });
    expect(dates).toEqual(["2026-09-07", "2026-09-14", "2026-09-21"]);
  });

  it("3. la fecha de inicio siempre queda incluida aunque su día de semana no esté seleccionado", () => {
    // 2026-09-07 es lunes, pero se pide solo martes (2).
    const dates = generateRecurrenceDates("2026-09-07", { frequency: "WEEKLY", weekdays: [2], until: "2026-09-08" });
    expect(dates).toContain("2026-09-07");
  });

  it("4. mensual: mismo día del mes en cada mes siguiente", () => {
    const dates = generateRecurrenceDates("2026-09-07", { frequency: "MONTHLY", weekdays: [], until: "2026-11-30" });
    expect(dates).toEqual(["2026-09-07", "2026-10-07", "2026-11-07"]);
  });

  it("5. 'hasta' anterior a la fecha de inicio: solo la fecha de inicio", () => {
    const dates = generateRecurrenceDates("2026-09-07", { frequency: "DAILY", weekdays: [], until: "2026-01-01" });
    expect(dates).toEqual(["2026-09-07"]);
  });

  it("6. nunca supera el tope máximo de ocurrencias", () => {
    const dates = generateRecurrenceDates("2026-01-01", { frequency: "DAILY", weekdays: [], until: "2030-01-01" });
    expect(dates.length).toBeLessThanOrEqual(180);
  });
});
