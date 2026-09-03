import type { TrainerFormInput } from "@/types/trainer";
import { EMAIL_PATTERN, PHONE_PATTERN, isFutureDate } from "./validation";

export type TrainerValidationErrors = Partial<Record<keyof TrainerFormInput, string>>;
export { hasValidationErrors } from "./validation";

/**
 * Validación sincrónica y pura. La unicidad del documento requiere consultar
 * la base de datos, así que se valida aparte en el servicio (trainerService).
 */
export function validateTrainerForm(
  input: TrainerFormInput,
  today: Date = new Date(),
): TrainerValidationErrors {
  const errors: TrainerValidationErrors = {};

  if (!input.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  }

  if (!input.document.trim()) {
    errors.document = "El documento es obligatorio.";
  }

  if (input.phone.trim() && !PHONE_PATTERN.test(input.phone.trim())) {
    errors.phone = "Ingresa un teléfono válido.";
  }

  if (input.email.trim() && !EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (input.birthDate) {
    if (Number.isNaN(new Date(`${input.birthDate}T00:00:00`).getTime())) {
      errors.birthDate = "Ingresa una fecha de nacimiento válida.";
    } else if (isFutureDate(input.birthDate, today)) {
      errors.birthDate = "La fecha de nacimiento no puede ser una fecha futura.";
    }
  }

  if (input.joinDate && Number.isNaN(new Date(`${input.joinDate}T00:00:00`).getTime())) {
    errors.joinDate = "Ingresa una fecha de ingreso válida.";
  }

  return errors;
}
