import type { ClientFormInput } from "@/types/client";
import {
  BODY_MEASUREMENT_LIMITS,
  EMAIL_PATTERN,
  PHONE_PATTERN,
  isFutureDate,
  validatePositiveField,
} from "./validation";
import { isValidAttendanceCode } from "./attendanceCode";

export type ClientValidationErrors = Partial<Record<keyof ClientFormInput, string>>;
export { hasValidationErrors } from "./validation";

/**
 * Validación sincrónica y pura de los campos del formulario. La unicidad del
 * documento requiere consultar la base de datos, así que se valida aparte en
 * el servicio (clientService), no aquí.
 */
export function validateClientForm(
  input: ClientFormInput,
  today: Date = new Date(),
): ClientValidationErrors {
  const errors: ClientValidationErrors = {};

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

  const weightError = validatePositiveField(input.weight, BODY_MEASUREMENT_LIMITS.weight, "El peso");
  if (weightError) errors.weight = weightError;

  const heightError = validatePositiveField(input.height, BODY_MEASUREMENT_LIMITS.height, "La altura");
  if (heightError) errors.height = heightError;

  const waistError = validatePositiveField(input.waist, BODY_MEASUREMENT_LIMITS.circumference, "La cintura");
  if (waistError) errors.waist = waistError;

  const chestError = validatePositiveField(input.chest, BODY_MEASUREMENT_LIMITS.circumference, "El pecho");
  if (chestError) errors.chest = chestError;

  const armError = validatePositiveField(input.arm, BODY_MEASUREMENT_LIMITS.circumference, "El brazo");
  if (armError) errors.arm = armError;

  const legError = validatePositiveField(input.leg, BODY_MEASUREMENT_LIMITS.circumference, "El muslo");
  if (legError) errors.leg = legError;

  const calfError = validatePositiveField(input.calf, BODY_MEASUREMENT_LIMITS.circumference, "La pantorrilla");
  if (calfError) errors.calf = calfError;

  const hipError = validatePositiveField(input.hip, BODY_MEASUREMENT_LIMITS.circumference, "La cadera");
  if (hipError) errors.hip = hipError;

  const bodyFatError = validatePositiveField(input.bodyFat, BODY_MEASUREMENT_LIMITS.bodyFat, "El porcentaje de grasa");
  if (bodyFatError) errors.bodyFat = bodyFatError;

  const muscleMassError = validatePositiveField(
    input.muscleMass,
    BODY_MEASUREMENT_LIMITS.muscleMass,
    "La masa muscular",
  );
  if (muscleMassError) errors.muscleMass = muscleMassError;

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

  // El código de asistencia es opcional (un cliente puede quedar sin él),
  // pero si se escribe algo debe cumplir el mismo formato que usa el
  // kiosco: exactamente 6 dígitos numéricos. La unicidad por gimnasio se
  // valida aparte en clientService, igual que el documento.
  if (input.attendanceCode && !isValidAttendanceCode(input.attendanceCode)) {
    errors.attendanceCode = "El código debe tener exactamente 6 dígitos.";
  }

  return errors;
}
