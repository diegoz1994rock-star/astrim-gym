import type { MembershipPlanFormInput } from "@/types/membership";
import { hasValidationErrors } from "./validation";

export type MembershipPlanValidationErrors = Partial<Record<keyof MembershipPlanFormInput, string>>;
export { hasValidationErrors };

export function validatePlanForm(input: MembershipPlanFormInput): MembershipPlanValidationErrors {
  const errors: MembershipPlanValidationErrors = {};

  if (!input.name.trim()) {
    errors.name = "El nombre del plan es obligatorio.";
  }

  if (input.durationDays === null || Number.isNaN(input.durationDays)) {
    errors.durationDays = "La duración es obligatoria.";
  } else if (!Number.isInteger(input.durationDays) || input.durationDays <= 0) {
    errors.durationDays = "La duración debe ser un número entero de días mayor a 0.";
  }

  if (input.price === null || Number.isNaN(input.price)) {
    errors.price = "El precio es obligatorio.";
  } else if (input.price < 0) {
    errors.price = "El precio no puede ser negativo.";
  }

  return errors;
}
