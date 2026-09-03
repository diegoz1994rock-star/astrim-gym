import { describe, expect, it } from "vitest";
import { computeBmi, classifyBmi } from "./bmi";

describe("computeBmi (punto 6)", () => {
  it("6. calcula el IMC correctamente: 96kg / 1.78m → 30.30", () => {
    const bmi = computeBmi(96, 1.78);
    expect(bmi).not.toBeNull();
    expect(Number(bmi?.toFixed(2))).toBe(30.3);
  });

  it("caso de referencia clásico: 70kg / 1.75m → 22.86", () => {
    const bmi = computeBmi(70, 1.75);
    expect(Number(bmi?.toFixed(2))).toBe(22.86);
  });

  it("devuelve null si falta el peso o la altura", () => {
    expect(computeBmi(null, 1.75)).toBeNull();
    expect(computeBmi(70, null)).toBeNull();
  });

  it("devuelve null con peso o altura no positivos", () => {
    expect(computeBmi(0, 1.75)).toBeNull();
    expect(computeBmi(70, 0)).toBeNull();
    expect(computeBmi(-70, 1.75)).toBeNull();
  });

  it("devuelve null con valores no finitos (NaN/Infinity)", () => {
    expect(computeBmi(Number.NaN, 1.75)).toBeNull();
    expect(computeBmi(70, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("classifyBmi", () => {
  it("clasifica correctamente cada rango", () => {
    expect(classifyBmi(17)).toBe("UNDERWEIGHT");
    expect(classifyBmi(22)).toBe("NORMAL");
    expect(classifyBmi(27)).toBe("OVERWEIGHT");
    expect(classifyBmi(33)).toBe("OBESE");
  });
});
