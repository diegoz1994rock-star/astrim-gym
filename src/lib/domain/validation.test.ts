import { describe, expect, it } from "vitest";
import { HEIGHT_CM_LIMITS, cmToMeters, metersToCm } from "./validation";

describe("metersToCm / cmToMeters", () => {
  it("convierte metros a centímetros redondeando", () => {
    expect(metersToCm(1.78)).toBe(178);
    expect(metersToCm(1.755)).toBe(176);
  });

  it("convierte centímetros a metros", () => {
    expect(cmToMeters(178)).toBeCloseTo(1.78);
    expect(cmToMeters(175)).toBeCloseTo(1.75);
  });

  it("los límites en cm corresponden exactamente a los límites en metros usados por la validación (0.3-2.5 m)", () => {
    expect(cmToMeters(HEIGHT_CM_LIMITS.min)).toBeCloseTo(0.3);
    expect(cmToMeters(HEIGHT_CM_LIMITS.max)).toBeCloseTo(2.5);
  });

  it("ida y vuelta conserva el valor (dentro del redondeo a cm entero)", () => {
    const originalCm = 175;
    expect(metersToCm(cmToMeters(originalCm))).toBe(originalCm);
  });
});
