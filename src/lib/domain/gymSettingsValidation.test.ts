import { describe, expect, it } from "vitest";
import { validateGymSettingsForm, hasValidationErrors } from "./gymSettingsValidation";
import type { GymSettingsFormInput } from "@/types/gym";

function baseInput(overrides: Partial<GymSettingsFormInput> = {}): GymSettingsFormInput {
  return {
    name: "Gimnasio Demo",
    phone: "",
    email: "",
    address: "",
    city: "",
    logoPath: null,
    ...overrides,
  };
}

describe("validateGymSettingsForm", () => {
  it("acepta una configuración válida", () => {
    const errors = validateGymSettingsForm(baseInput());
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("3. rechaza un nombre vacío", () => {
    const errors = validateGymSettingsForm(baseInput({ name: "   " }));
    expect(errors.name).toBeDefined();
  });

  it("rechaza un nombre demasiado largo", () => {
    const errors = validateGymSettingsForm(baseInput({ name: "a".repeat(200) }));
    expect(errors.name).toBeDefined();
  });

  it("4. rechaza un correo inválido", () => {
    const errors = validateGymSettingsForm(baseInput({ email: "no-es-un-correo" }));
    expect(errors.email).toBeDefined();
  });

  it("4b. acepta un correo válido", () => {
    const errors = validateGymSettingsForm(baseInput({ email: "contacto@gimnasio.com" }));
    expect(errors.email).toBeUndefined();
  });

  it("5. rechaza un teléfono inválido", () => {
    const errors = validateGymSettingsForm(baseInput({ phone: "abc" }));
    expect(errors.phone).toBeDefined();
  });

  it("5b. acepta un teléfono válido", () => {
    const errors = validateGymSettingsForm(baseInput({ phone: "300 111 2233" }));
    expect(errors.phone).toBeUndefined();
  });

  it("teléfono y correo son opcionales", () => {
    const errors = validateGymSettingsForm(baseInput({ phone: "", email: "" }));
    expect(hasValidationErrors(errors)).toBe(false);
  });
});
