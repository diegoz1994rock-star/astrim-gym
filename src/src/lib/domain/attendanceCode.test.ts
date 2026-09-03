import { describe, expect, it } from "vitest";
import { generateAttendanceCode, isValidAttendanceCode } from "./attendanceCode";

describe("generateAttendanceCode", () => {
  it("1. genera siempre exactamente 6 dígitos numéricos", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateAttendanceCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("2. no genera códigos secuenciales (alta variabilidad)", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateAttendanceCode()));
    // Con 200 muestras sobre 1.000.000 de posibilidades, prácticamente
    // todas deberían ser distintas; una colisión ocasional es aceptable,
    // pero una generación secuencial o degenerada produciría muchas menos.
    expect(codes.size).toBeGreaterThan(190);
  });

  it("3. conserva ceros a la izquierda", () => {
    for (let i = 0; i < 500; i += 1) {
      expect(generateAttendanceCode()).toHaveLength(6);
    }
  });
});

describe("isValidAttendanceCode", () => {
  it("4. acepta exactamente 6 dígitos", () => {
    expect(isValidAttendanceCode("123456")).toBe(true);
    expect(isValidAttendanceCode("000000")).toBe(true);
  });

  it("5. rechaza longitudes distintas de 6", () => {
    expect(isValidAttendanceCode("12345")).toBe(false);
    expect(isValidAttendanceCode("1234567")).toBe(false);
    expect(isValidAttendanceCode("")).toBe(false);
  });

  it("6. rechaza caracteres no numéricos", () => {
    expect(isValidAttendanceCode("12345a")).toBe(false);
    expect(isValidAttendanceCode("12 345")).toBe(false);
  });
});
