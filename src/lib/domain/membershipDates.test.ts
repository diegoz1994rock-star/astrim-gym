import { describe, expect, it } from "vitest";
import { addDays, calculateEndDate, calculateRenewalStartDate, toIsoDate } from "./membershipDates";

describe("calculateEndDate", () => {
  it("plan de 30 días: 29/08/2026 → 28/09/2026", () => {
    expect(calculateEndDate("2026-08-29", 30)).toBe("2026-09-28");
  });

  it("plan de 90 días (trimestral)", () => {
    expect(calculateEndDate("2026-01-01", 90)).toBe("2026-04-01");
  });

  it("cambio de mes: 15/01/2026 + 30 días", () => {
    expect(calculateEndDate("2026-01-15", 30)).toBe("2026-02-14");
  });

  it("cambio de año: 15/12/2026 + 30 días", () => {
    expect(calculateEndDate("2026-12-15", 30)).toBe("2027-01-14");
  });

  it("año bisiesto: 31/01/2024 + 30 días incluye el 29 de febrero", () => {
    expect(calculateEndDate("2024-01-31", 30)).toBe("2024-03-01");
  });

  it("año NO bisiesto: 31/01/2026 + 30 días", () => {
    expect(calculateEndDate("2026-01-31", 30)).toBe("2026-03-02");
  });
});

describe("addDays / toIsoDate", () => {
  it("suma días simples", () => {
    expect(toIsoDate(addDays(new Date(2026, 0, 1), 5))).toBe("2026-01-06");
  });
});

describe("calculateRenewalStartDate", () => {
  it("membresía vencida: la renovación empieza hoy", () => {
    const today = new Date(2026, 8, 30); // 30/09/2026
    expect(calculateRenewalStartDate("2026-09-28", today)).toBe("2026-09-30");
  });

  it("membresía vence hoy: se considera vigente, empieza al día siguiente", () => {
    const today = new Date(2026, 8, 28); // 28/09/2026
    expect(calculateRenewalStartDate("2026-09-28", today)).toBe("2026-09-29");
  });

  it("membresía vence en 1 día: aún vigente, no se pierden días", () => {
    const today = new Date(2026, 8, 27);
    expect(calculateRenewalStartDate("2026-09-28", today)).toBe("2026-09-29");
  });
});
