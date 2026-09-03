import { describe, expect, it } from "vitest";
import { generatePairingCode, isValidPairingCode } from "./pairingCode";

describe("generatePairingCode / isValidPairingCode", () => {
  it("1. genera exactamente 6 dígitos", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(generatePairingCode()).toMatch(/^\d{6}$/);
    }
  });

  it("2. valida formato de 6 dígitos", () => {
    expect(isValidPairingCode("739251")).toBe(true);
    expect(isValidPairingCode("12345")).toBe(false);
    expect(isValidPairingCode("12345a")).toBe(false);
  });
});
