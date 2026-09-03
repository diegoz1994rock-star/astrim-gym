import { describe, expect, it } from "vitest";
import { computeMembershipStatus } from "./membershipStatus";

const TODAY = new Date(2026, 8, 1); // 01/09/2026

function daysFromToday(days: number): string {
  const date = new Date(TODAY);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("computeMembershipStatus", () => {
  it("vencida ayer → EXPIRED", () => {
    expect(computeMembershipStatus({ endDate: daysFromToday(-1), today: TODAY })).toBe("EXPIRED");
  });

  it("vence hoy → EXPIRING_SOON (dentro del umbral de 7 días)", () => {
    expect(computeMembershipStatus({ endDate: daysFromToday(0), today: TODAY })).toBe(
      "EXPIRING_SOON",
    );
  });

  it("vence en 1 día → EXPIRING_SOON", () => {
    expect(computeMembershipStatus({ endDate: daysFromToday(1), today: TODAY })).toBe(
      "EXPIRING_SOON",
    );
  });

  it("vence en 7 días → EXPIRING_SOON (límite exacto del umbral)", () => {
    expect(computeMembershipStatus({ endDate: daysFromToday(7), today: TODAY })).toBe(
      "EXPIRING_SOON",
    );
  });

  it("vence en 8 días → ACTIVE (justo fuera del umbral)", () => {
    expect(computeMembershipStatus({ endDate: daysFromToday(8), today: TODAY })).toBe("ACTIVE");
  });

  it("suspendida manualmente prevalece sobre la fecha", () => {
    expect(
      computeMembershipStatus({ endDate: daysFromToday(20), manualStatus: "SUSPENDED", today: TODAY }),
    ).toBe("SUSPENDED");
  });

  it("cancelada manualmente prevalece incluso si ya venció", () => {
    expect(
      computeMembershipStatus({ endDate: daysFromToday(-30), manualStatus: "CANCELLED", today: TODAY }),
    ).toBe("CANCELLED");
  });
});
