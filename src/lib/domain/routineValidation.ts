import {
  ROUTINE_NAME_OPTIONS,
  ROUTINE_OBJECTIVE_OPTIONS,
  type AssignRoutineFormInput,
  type RoutineExerciseFormInput,
  type RoutineFormInput,
} from "@/types/routine";
import { hasValidationErrors } from "./validation";
import { validateExerciseConfig } from "./exerciseConfigValidation";
import type { CardioEquipmentProfile, ExerciseConfigurationMode } from "./exerciseConfigMode";

export type RoutineValidationErrors = Partial<Record<keyof RoutineFormInput, string>>;
export type AssignRoutineValidationErrors = Partial<Record<keyof AssignRoutineFormInput, string>>;
export type RoutineExerciseValidationErrors = Partial<Record<keyof RoutineExerciseFormInput, string>>;
export { hasValidationErrors };

export interface RoutineFormValidationOptions {
  /**
   * Nombre/objetivo ya guardados en la rutina que se está editando. Si el
   * valor enviado coincide exactamente con el valor histórico (es decir,
   * el administrador no lo cambió), se acepta aunque no esté en el
   * catálogo actual — así las rutinas antiguas nunca dejan de poder
   * guardarse solo por tener un nombre/objetivo que ya no está en la lista.
   */
  allowedName?: string | null;
  allowedDescription?: string | null;
}

export function validateRoutineForm(
  input: RoutineFormInput,
  options: RoutineFormValidationOptions = {},
): RoutineValidationErrors {
  const errors: RoutineValidationErrors = {};

  const name = input.name.trim();
  if (!name) {
    errors.name = "Selecciona el nombre de la rutina.";
  } else if (!ROUTINE_NAME_OPTIONS.includes(name) && name !== options.allowedName) {
    errors.name = "Selecciona una rutina válida del catálogo.";
  }

  const description = input.description.trim();
  if (
    description &&
    !ROUTINE_OBJECTIVE_OPTIONS.includes(description) &&
    description !== (options.allowedDescription ?? "")
  ) {
    errors.description = "Selecciona un objetivo válido del catálogo.";
  }

  return errors;
}

export function validateAssignRoutineForm(input: AssignRoutineFormInput): AssignRoutineValidationErrors {
  const errors: AssignRoutineValidationErrors = {};

  if (input.clientIds.length === 0) {
    errors.clientIds = "Selecciona al menos un cliente.";
  }

  const start = input.startDate ? new Date(`${input.startDate}T00:00:00`) : null;
  const end = input.endDate ? new Date(`${input.endDate}T00:00:00`) : null;

  if (input.startDate && start && Number.isNaN(start.getTime())) {
    errors.startDate = "Ingresa una fecha de inicio válida.";
  }

  if (input.endDate && end && Number.isNaN(end.getTime())) {
    errors.endDate = "Ingresa una fecha final válida.";
  } else if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    if (end.getTime() < start.getTime()) {
      errors.endDate = "La fecha final no puede ser anterior a la fecha de inicio.";
    }
  }

  return errors;
}

/**
 * Rutina: valida qué ejercicio se eligió + delega la validación de los
 * valores (series/reps/tiempo/...) en `validateExerciseConfig`, que es la
 * misma que usan las Clases/Sesiones.
 */
export function validateRoutineExerciseForm(
  input: RoutineExerciseFormInput,
  mode: ExerciseConfigurationMode = "STRENGTH",
  cardioProfile: CardioEquipmentProfile = "GENERIC",
): RoutineExerciseValidationErrors {
  const errors: RoutineExerciseValidationErrors = { ...validateExerciseConfig(input, mode, cardioProfile) };
  if (!input.exerciseId) {
    errors.exerciseId = "Selecciona un ejercicio.";
  }
  return errors;
}
