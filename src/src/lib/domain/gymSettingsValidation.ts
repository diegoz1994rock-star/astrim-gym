import type { GymSettingsFormInput } from "@/types/gym";
import { EMAIL_PATTERN, PHONE_PATTERN, hasValidationErrors } from "./validation";

export type GymSettingsValidationErrors = Partial<Record<keyof GymSettingsFormInput, string>>;
export { hasValidationErrors };

const MAX_NAME_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 200;
const MAX_CITY_LENGTH = 80;

export function validateGymSettingsForm(input: GymSettingsFormInput): GymSettingsValidationErrors {
  const errors: GymSettingsValidationErrors = {};

  const name = input.name.trim();
  if (!name) {
    errors.name = "El nombre del gimnasio es obligatorio.";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (input.phone.trim() && !PHONE_PATTERN.test(input.phone.trim())) {
    errors.phone = "Ingresa un teléfono válido.";
  }

  if (input.email.trim() && !EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (input.address.trim().length > MAX_ADDRESS_LENGTH) {
    errors.address = `La dirección no puede superar los ${MAX_ADDRESS_LENGTH} caracteres.`;
  }

  if (input.city.trim().length > MAX_CITY_LENGTH) {
    errors.city = `La ciudad no puede superar los ${MAX_CITY_LENGTH} caracteres.`;
  }

  return errors;
}
