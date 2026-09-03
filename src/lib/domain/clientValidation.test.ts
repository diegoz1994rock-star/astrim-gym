import { describe, expect, it } from "vitest";
import { validateClientForm, hasValidationErrors } from "./clientValidation";
import { emptyClientForm } from "@/types/client";

function baseInput() {
  return { ...emptyClientForm(), name: "Juan Pérez", document: "12345678" };
}

describe("validateClientForm — datos básicos (sin cambios de comportamiento)", () => {
  it("rechaza un cliente sin nombre", () => {
    const errors = validateClientForm({ ...baseInput(), name: "" });
    expect(errors.name).toBeDefined();
  });

  it("rechaza un cliente sin documento", () => {
    const errors = validateClientForm({ ...baseInput(), document: "" });
    expect(errors.document).toBeDefined();
  });
});

describe("validateClientForm — medidas corporales", () => {
  it("1. crea un cliente válido sin ninguna medida corporal", () => {
    const errors = validateClientForm(baseInput());
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("2. crea un cliente solamente con peso y altura", () => {
    const input = { ...baseInput(), weight: 80, height: 1.78 };
    expect(hasValidationErrors(validateClientForm(input))).toBe(false);
  });

  it("3. crea un cliente con todas las medidas", () => {
    const input = {
      ...baseInput(),
      weight: 80,
      height: 1.78,
      waist: 85,
      chest: 102,
      arm: 36,
      leg: 58,
      calf: 39,
      hip: 96,
      bodyFat: 18,
      muscleMass: 65,
    };
    expect(hasValidationErrors(validateClientForm(input))).toBe(false);
  });

  it("4. acepta editar el peso a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), weight: 82 });
    expect(errors.weight).toBeUndefined();
  });

  it("5. acepta editar la cintura a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), waist: 83 });
    expect(errors.waist).toBeUndefined();
  });

  it("6. acepta editar el pecho a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), chest: 100 });
    expect(errors.chest).toBeUndefined();
  });

  it("7. acepta editar el brazo a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), arm: 35 });
    expect(errors.arm).toBeUndefined();
  });

  it("8. acepta editar el muslo a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), leg: 55 });
    expect(errors.leg).toBeUndefined();
  });

  it("9. acepta editar la pantorrilla a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), calf: 38 });
    expect(errors.calf).toBeUndefined();
  });

  it("10. acepta editar la cadera a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), hip: 95 });
    expect(errors.hip).toBeUndefined();
  });

  it("11. acepta editar la grasa corporal a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), bodyFat: 20 });
    expect(errors.bodyFat).toBeUndefined();
  });

  it("12. acepta editar la masa muscular a un valor válido", () => {
    const errors = validateClientForm({ ...baseInput(), muscleMass: 60 });
    expect(errors.muscleMass).toBeUndefined();
  });

  it("13. rechaza valores negativos", () => {
    const errors = validateClientForm({ ...baseInput(), weight: -80, waist: -85 });
    expect(errors.weight).toBeDefined();
    expect(errors.waist).toBeDefined();
  });

  it("13b. rechaza valor cero (0 kg/cm no es una medida corporal válida)", () => {
    const errors = validateClientForm({ ...baseInput(), weight: 0, chest: 0 });
    expect(errors.weight).toBeDefined();
    expect(errors.chest).toBeDefined();
  });

  it("14. rechaza valores fuera de rango", () => {
    const errors = validateClientForm({ ...baseInput(), weight: 500, height: 3, hip: 400 });
    expect(errors.weight).toBeDefined();
    expect(errors.height).toBeDefined();
    expect(errors.hip).toBeDefined();
  });

  it("15. rechaza NaN", () => {
    const errors = validateClientForm({ ...baseInput(), arm: NaN });
    expect(errors.arm).toBeDefined();
  });

  it("16. rechaza Infinity", () => {
    const errors = validateClientForm({ ...baseInput(), muscleMass: Infinity });
    expect(errors.muscleMass).toBeDefined();
  });

  it("grasa corporal acepta el límite superior (100%) y rechaza más de 100%", () => {
    expect(validateClientForm({ ...baseInput(), bodyFat: 100 }).bodyFat).toBeUndefined();
    expect(validateClientForm({ ...baseInput(), bodyFat: 101 }).bodyFat).toBeDefined();
  });

  it("no usa reglas contradictorias con las de Progreso: mismos límites (peso 1-400, altura 0.3-2.5)", () => {
    expect(validateClientForm({ ...baseInput(), weight: 1 }).weight).toBeUndefined();
    expect(validateClientForm({ ...baseInput(), weight: 400 }).weight).toBeUndefined();
    expect(validateClientForm({ ...baseInput(), weight: 400.1 }).weight).toBeDefined();
    expect(validateClientForm({ ...baseInput(), height: 0.3 }).height).toBeUndefined();
    expect(validateClientForm({ ...baseInput(), height: 2.5 }).height).toBeUndefined();
    expect(validateClientForm({ ...baseInput(), height: 2.6 }).height).toBeDefined();
  });
});

describe("validateClientForm — código de asistencia", () => {
  it("acepta un cliente sin código (es opcional)", () => {
    const errors = validateClientForm({ ...baseInput(), attendanceCode: null });
    expect(errors.attendanceCode).toBeUndefined();
  });

  it("acepta un código válido de 6 dígitos", () => {
    const errors = validateClientForm({ ...baseInput(), attendanceCode: "475783" });
    expect(errors.attendanceCode).toBeUndefined();
  });

  it("rechaza un código con menos de 6 dígitos", () => {
    const errors = validateClientForm({ ...baseInput(), attendanceCode: "1234" });
    expect(errors.attendanceCode).toBe("El código debe tener exactamente 6 dígitos.");
  });

  it("rechaza un código con más de 6 dígitos", () => {
    const errors = validateClientForm({ ...baseInput(), attendanceCode: "1234567" });
    expect(errors.attendanceCode).toBeDefined();
  });

  it("rechaza letras", () => {
    const errors = validateClientForm({ ...baseInput(), attendanceCode: "12345a" });
    expect(errors.attendanceCode).toBeDefined();
  });

  it("rechaza espacios", () => {
    const errors = validateClientForm({ ...baseInput(), attendanceCode: "12 345" });
    expect(errors.attendanceCode).toBeDefined();
  });
});
