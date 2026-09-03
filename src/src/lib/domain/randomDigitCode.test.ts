import { describe, expect, it } from "vitest";
import { generateRandomDigitCode, isValidDigitCode } from "./randomDigitCode";

describe("generateRandomDigitCode", () => {
  it("1. genera la longitud exacta pedida, con ceros a la izquierda", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateRandomDigitCode(6)).toMatch(/^\d{6}$/);
      expect(generateRandomDigitCode(4)).toMatch(/^\d{4}$/);
    }
  });

  it("2. alta variabilidad entre llamadas (no secuencial)", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRandomDigitCode(6)));
    expect(codes.size).toBeGreaterThan(190);
  });
});

describe("isValidDigitCode", () => {
  it("3. acepta solo la longitud exacta", () => {
    expect(isValidDigitCode("12345", 5)).toBe(true);
    expect(isValidDigitCode("1234", 5)).toBe(false);
    expect(isValidDigitCode("123456", 5)).toBe(false);
  });

  it("4. rechaza letras y espacios", () => {
    expect(isValidDigitCode("12a45", 5)).toBe(false);
    expect(isValidDigitCode("12 45", 5)).toBe(false);
  });
});
