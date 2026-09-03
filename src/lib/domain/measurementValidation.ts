import type { MeasurementFormInput } from "@/types/measurement";
import { BODY_MEASUREMENT_LIMITS as LIMITS, hasValidationErrors, validatePositiveField } from "./validation";

export type MeasurementValidationErrors = Partial<Record<keyof MeasurementFormInput, string>>;
export { hasValidationErrors };

export function validateMeasurementForm(
  input: MeasurementFormInput,
  today: Date = new Date(),
): MeasurementValidationErrors {
  const errors: MeasurementValidationErrors = {};

  if (!input.clientId) {
    errors.clientId = "Selecciona un cliente.";
  }

  const date = new Date(`${input.date}T00:00:00`);
  if (!input.date || Number.isNaN(date.getTime())) {
    errors.date = "Ingresa una fecha válida.";
  } else {
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    if (date.getTime() > todayEnd.getTime()) {
      errors.date = "La fecha de medición no puede ser futura.";
    } else if (date.getFullYear() < 1950) {
      errors.date = "Ingresa una fecha de medición válida.";
    }
  }

  const weightError = validatePositiveField(input.weight, LIMITS.weight, "El peso");
  if (weightError) errors.weight = weightError;

  const heightError = validatePositiveField(input.height, LIMITS.height, "La altura");
  if (heightError) errors.height = heightError;

  const waistError = validatePositiveField(input.waist, LIMITS.circumference, "La cintura");
  if (waistError) errors.waist = waistError;

  const chestError = validatePositiveField(input.chest, LIMITS.circumference, "El pecho");
  if (chestError) errors.chest = chestError;

  const armError = validatePositiveField(input.arm, LIMITS.circumference, "El brazo");
  if (armError) errors.arm = armError;

  const legError = validatePositiveField(input.leg, LIMITS.circumference, "El muslo");
  if (legError) errors.leg = legError;

  const calfError = validatePositiveField(input.calf, LIMITS.circumference, "La pantorrilla");
  if (calfError) errors.calf = calfError;

  const hipError = validatePositiveField(input.hip, LIMITS.circumference, "La cadera");
  if (hipError) errors.hip = hipError;

  const bodyFatError = validatePositiveField(input.bodyFat, LIMITS.bodyFat, "El porcentaje de grasa");
  if (bodyFatError) errors.bodyFat = bodyFatError;

  const muscleMassError = validatePositiveField(input.muscleMass, LIMITS.muscleMass, "La masa muscular");
  if (muscleMassError) errors.muscleMass = muscleMassError;

  return errors;
}
