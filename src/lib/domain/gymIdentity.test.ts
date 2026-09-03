import { describe, expect, it } from "vitest";
import { FALLBACK_GYM_NAME, resolveGymDisplayName } from "./gymIdentity";

describe("resolveGymDisplayName", () => {
  it("2. muestra el nombre del gimnasio cuando existe", () => {
    expect(resolveGymDisplayName("Gimnasio Fuerza Total")).toBe("Gimnasio Fuerza Total");
  });

  it("6. gimnasios distintos muestran su propio nombre (no se mezclan)", () => {
    expect(resolveGymDisplayName("Gimnasio Fuerza Total")).toBe("Gimnasio Fuerza Total");
    expect(resolveGymDisplayName("Titan Fitness")).toBe("Titan Fitness");
  });

  it("usa el fallback cuando el nombre es null", () => {
    expect(resolveGymDisplayName(null)).toBe(FALLBACK_GYM_NAME);
  });

  it("usa el fallback cuando el nombre es undefined", () => {
    expect(resolveGymDisplayName(undefined)).toBe(FALLBACK_GYM_NAME);
  });

  it("usa el fallback cuando el nombre es una cadena vacía o solo espacios", () => {
    expect(resolveGymDisplayName("")).toBe(FALLBACK_GYM_NAME);
    expect(resolveGymDisplayName("   ")).toBe(FALLBACK_GYM_NAME);
  });

  it("el fallback nunca es la marca del software", () => {
    expect(FALLBACK_GYM_NAME).not.toContain("ASTRIM");
  });

  it("5. un nombre muy largo se conserva sin romperse (el truncamiento visual es responsabilidad del CSS)", () => {
    const longName = "Gimnasio ".repeat(20).trim();
    expect(resolveGymDisplayName(longName)).toBe(longName);
  });

  it("recorta espacios sobrantes alrededor del nombre", () => {
    expect(resolveGymDisplayName("  Titan Fitness  ")).toBe("Titan Fitness");
  });
});
