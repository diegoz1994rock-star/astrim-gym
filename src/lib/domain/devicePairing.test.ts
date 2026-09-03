import { describe, expect, it } from "vitest";
import { evaluatePairingAttempt } from "./devicePairing";

const NOW = new Date(2026, 7, 30, 12, 0, 0);

describe("evaluatePairingAttempt", () => {
  it("1. código inexistente: denegado", () => {
    const result = evaluatePairingAttempt({ codeFound: false, now: NOW });
    expect(result.kind).toBe("DENIED_CODE_NOT_FOUND");
  });

  it("2. código cancelado: denegado", () => {
    const result = evaluatePairingAttempt({
      codeFound: true,
      codeStatus: "CANCELLED",
      deviceStatus: "PENDING",
      now: NOW,
    });
    expect(result.kind).toBe("DENIED_CANCELLED");
  });

  it("3. código ya usado: denegado", () => {
    const result = evaluatePairingAttempt({
      codeFound: true,
      codeStatus: "USED",
      deviceStatus: "ACTIVE",
      now: NOW,
    });
    expect(result.kind).toBe("DENIED_ALREADY_USED");
  });

  it("4. código con fecha de expiración ya pasada: denegado, aunque el status siga PENDING", () => {
    const result = evaluatePairingAttempt({
      codeFound: true,
      codeStatus: "PENDING",
      expiresAt: "2026-08-30 10:00:00",
      deviceStatus: "PENDING",
      now: NOW,
    });
    expect(result.kind).toBe("DENIED_EXPIRED");
  });

  it("5. status EXPIRED explícito: denegado", () => {
    const result = evaluatePairingAttempt({
      codeFound: true,
      codeStatus: "EXPIRED",
      deviceStatus: "PENDING",
      now: NOW,
    });
    expect(result.kind).toBe("DENIED_EXPIRED");
  });

  it("6. dispositivo ya no está pendiente (ya vinculado o revocado): denegado", () => {
    const result = evaluatePairingAttempt({
      codeFound: true,
      codeStatus: "PENDING",
      expiresAt: "2026-08-30 13:00:00",
      deviceStatus: "ACTIVE",
      now: NOW,
    });
    expect(result.kind).toBe("DENIED_DEVICE_NOT_PENDING");
  });

  it("7. código válido, vigente, dispositivo pendiente: aprobado", () => {
    const result = evaluatePairingAttempt({
      codeFound: true,
      codeStatus: "PENDING",
      expiresAt: "2026-08-30 13:00:00",
      deviceStatus: "PENDING",
      now: NOW,
    });
    expect(result.kind).toBe("APPROVED");
  });
});
