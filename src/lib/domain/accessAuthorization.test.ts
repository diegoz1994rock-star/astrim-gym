import { describe, expect, it } from "vitest";
import { evaluateAccess } from "./accessAuthorization";

const TODAY = new Date(2026, 7, 30);

describe("evaluateAccess", () => {
  it("1. código inexistente: denegado sin revelar más información", () => {
    const result = evaluateAccess({
      clientFound: false,
      openAttendance: null,
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result.kind).toBe("DENIED_CODE_NOT_FOUND");
  });

  it("2. cliente inactivo: denegado", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "INACTIVE",
      membershipEndDate: "2026-12-01",
      openAttendance: null,
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result.kind).toBe("DENIED_CLIENT_INACTIVE");
  });

  it("3. membresía vencida: denegado", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: "2026-01-01",
      openAttendance: null,
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result).toEqual({ kind: "DENIED_MEMBERSHIP_INVALID", membershipStatus: "EXPIRED" });
  });

  it("3b. sin membresía asignada: denegado", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: null,
      openAttendance: null,
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result).toEqual({ kind: "DENIED_MEMBERSHIP_INVALID", membershipStatus: null });
  });

  it("3c. membresía suspendida manualmente: denegado aunque la fecha no haya vencido", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: "2026-12-01",
      membershipManualStatus: "SUSPENDED",
      openAttendance: null,
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result).toEqual({ kind: "DENIED_MEMBERSHIP_INVALID", membershipStatus: "SUSPENDED" });
  });

  it("4. entrada válida: cliente activo con membresía activa y sin sesión abierta", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: "2026-12-01",
      openAttendance: null,
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result.kind).toBe("ENTRY_ALLOWED");
  });

  it("4b. entrada válida con membresía por vencer (no bloquea el acceso)", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: "2026-09-02",
      openAttendance: null,
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result.kind).toBe("ENTRY_ALLOWED");
  });

  it("5. salida válida: ya existe una sesión abierta fuera de la ventana anti-duplicado", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: "2026-12-01",
      openAttendance: { secondsSinceEntry: 120 },
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result.kind).toBe("EXIT_ALLOWED");
  });

  it("6. doble toque dentro de la ventana anti-duplicado: se ignora, no cierra la sesión", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: "2026-12-01",
      openAttendance: { secondsSinceEntry: 5 },
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result).toEqual({ kind: "DUPLICATE_IGNORED", secondsSinceEntry: 5 });
  });

  it("7. la salida nunca vuelve a validar la membresía (siempre se puede salir)", () => {
    const result = evaluateAccess({
      clientFound: true,
      clientStatus: "ACTIVE",
      membershipEndDate: "2026-01-01", // vencida
      openAttendance: { secondsSinceEntry: 999 },
      duplicateWindowSeconds: 30,
      today: TODAY,
    });
    expect(result.kind).toBe("EXIT_ALLOWED");
  });
});
