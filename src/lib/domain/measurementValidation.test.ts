import { describe, expect, it } from "vitest";
import { validateMeasurementForm, hasValidationErrors } from "./measurementValidation";
import { emptyMeasurementForm } from "@/types/measurement";

// Debe coincidir con la fecha real: emptyMeasurementForm() usa new Date()
// como valor por defecto, así que una fecha fija aquí queda obsoleta tan
// pronto pasa el día (ya ocurrió: estaba fijada en 2026-08-29 y dejó de
// pasar el 2026-08-30). Se calcula dinámicamente para no volver a romperse.
const TODAY = new Date();

describe("validateMeasurementForm", () => {
  it("1. acepta una medición válida", () => {
    const input = { ...emptyMeasurementForm("client_1"), weight: 96, height: 1.78 };
    expect(hasValidationErrors(validateMeasurementForm(input, TODAY))).toBe(false);
  });

  it("2. rechaza una medición sin cliente", () => {
    const input = { ...emptyMeasurementForm(""), weight: 96, height: 1.78 };
    const errors = validateMeasurementForm(input, TODAY);
    expect(errors.clientId).toBeDefined();
  });

  it("4. rechaza peso negativo o cero", () => {
    expect(
      validateMeasurementForm({ ...emptyMeasurementForm("c1"), weight: -5 }, TODAY).weight,
    ).toBeDefined();
    expect(
      validateMeasurementForm({ ...emptyMeasurementForm("c1"), weight: 0 }, TODAY).weight,
    ).toBeDefined();
  });

  it("4b. rechaza peso no finito (NaN/Infinity)", () => {
    expect(
      validateMeasurementForm({ ...emptyMeasurementForm("c1"), weight: Number.NaN }, TODAY).weight,
    ).toBeDefined();
  });

  it("5. rechaza altura negativa, cero o fuera de rango razonable", () => {
    expect(
      validateMeasurementForm({ ...emptyMeasurementForm("c1"), height: -1 }, TODAY).height,
    ).toBeDefined();
    expect(
      validateMeasurementForm({ ...emptyMeasurementForm("c1"), height: 10 }, TODAY).height,
    ).toBeDefined();
  });

  it("acepta el peso/altura sin especificar (opcionales)", () => {
    const input = emptyMeasurementForm("client_1");
    expect(hasValidationErrors(validateMeasurementForm(input, TODAY))).toBe(false);
  });

  it("rechaza una fecha futura", () => {
    const input = { ...emptyMeasurementForm("client_1"), date: "2026-09-15" };
    const errors = validateMeasurementForm(input, TODAY);
    expect(errors.date).toBeDefined();
  });

  it("rechaza valores corporales negativos (ej. cintura)", () => {
    const input = { ...emptyMeasurementForm("client_1"), waist: -10 };
    const errors = validateMeasurementForm(input, TODAY);
    expect(errors.waist).toBeDefined();
  });

  it("rechaza porcentaje de grasa fuera de 0-100", () => {
    const input = { ...emptyMeasurementForm("client_1"), bodyFat: 150 };
    const errors = validateMeasurementForm(input, TODAY);
    expect(errors.bodyFat).toBeDefined();
  });
});
