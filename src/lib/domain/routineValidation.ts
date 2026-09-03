import {
  ROUTINE_NAME_OPTIONS,
  ROUTINE_OBJECTIVE_OPTIONS,
  type RoutineExerciseFormInput,
  type RoutineFormInput,
} from "@/types/routine";
import { hasValidationErrors } from "./validation";
import type { CardioEquipmentProfile, ExerciseConfigurationMode } from "./exerciseConfigMode";

export type RoutineValidationErrors = Partial<Record<keyof RoutineFormInput, string>>;
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

  if (!input.clientId) {
    errors.clientId = "Selecciona un cliente.";
  }

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

const MAX_TIME_MINUTES = 600; // 10 horas
const MAX_TIME_HOURS = 10;
const MAX_SPEED_KMH = 30;
const MAX_INCLINE_PERCENT = 40;
const MAX_RESISTANCE_LEVEL = 30;
const MIN_RPM = 20;
const MAX_RPM = 220;

function isValidFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

export function validateRoutineExerciseForm(
  input: RoutineExerciseFormInput,
  mode: ExerciseConfigurationMode = "STRENGTH",
  cardioProfile: CardioEquipmentProfile = "GENERIC",
): RoutineExerciseValidationErrors {
  const errors: RoutineExerciseValidationErrors = {};

  if (!input.exerciseId) {
    errors.exerciseId = "Selecciona un ejercicio.";
  }

  if (mode === "STRENGTH") {
    if (input.sets !== null && (!Number.isInteger(input.sets) || input.sets <= 0)) {
      errors.sets = "Las series deben ser un número entero positivo.";
    }

    if (input.reps !== null && (!Number.isInteger(input.reps) || input.reps <= 0)) {
      errors.reps = "Las repeticiones deben ser un número entero positivo.";
    }

    if (input.weight !== null && (Number.isNaN(input.weight) || input.weight < 0)) {
      errors.weight = "El peso no puede ser negativo.";
    }

    if (input.restSeconds !== null && (!Number.isInteger(input.restSeconds) || input.restSeconds < 0)) {
      errors.restSeconds = "El descanso debe ser un número entero de segundos.";
    }

    return errors;
  }

  // CARDIO_TIME y MOBILITY comparten el campo Tiempo.
  if (input.timeValue === null || input.timeUnit === null) {
    errors.timeValue = "Ingresa el tiempo del ejercicio.";
  } else if (!isValidFiniteNumber(input.timeValue)) {
    errors.timeValue = "El tiempo no es válido.";
  } else if (input.timeValue <= 0) {
    errors.timeValue = "El tiempo debe ser mayor que 0.";
  } else if (input.timeUnit === "MINUTES" && input.timeValue > MAX_TIME_MINUTES) {
    errors.timeValue = `El tiempo no puede superar los ${MAX_TIME_MINUTES} minutos.`;
  } else if (input.timeUnit === "HOURS" && input.timeValue > MAX_TIME_HOURS) {
    errors.timeValue = `El tiempo no puede superar las ${MAX_TIME_HOURS} horas.`;
  }

  if (mode !== "CARDIO_TIME") {
    return errors;
  }

  if (cardioProfile === "TREADMILL") {
    if (input.speedKmh === null) {
      errors.speedKmh = "Ingresa la velocidad.";
    } else if (!isValidFiniteNumber(input.speedKmh) || input.speedKmh <= 0) {
      errors.speedKmh = "La velocidad debe ser mayor que 0.";
    } else if (input.speedKmh > MAX_SPEED_KMH) {
      errors.speedKmh = `La velocidad no puede superar ${MAX_SPEED_KMH} km/h.`;
    }

    if (input.inclinePercent !== null) {
      if (!isValidFiniteNumber(input.inclinePercent) || input.inclinePercent < 0) {
        errors.inclinePercent = "La inclinación no puede ser negativa.";
      } else if (input.inclinePercent > MAX_INCLINE_PERCENT) {
        errors.inclinePercent = `La inclinación no puede superar ${MAX_INCLINE_PERCENT}%.`;
      }
    }
  } else if (cardioProfile === "BIKE" || cardioProfile === "ROWER" || cardioProfile === "CLIMBER") {
    if (input.resistanceLevel === null) {
      errors.resistanceLevel = "Ingresa el nivel de resistencia.";
    } else if (!Number.isInteger(input.resistanceLevel) || input.resistanceLevel <= 0) {
      errors.resistanceLevel = "El nivel de resistencia debe ser un número entero positivo.";
    } else if (input.resistanceLevel > MAX_RESISTANCE_LEVEL) {
      errors.resistanceLevel = `El nivel de resistencia no puede superar ${MAX_RESISTANCE_LEVEL}.`;
    }

    if (cardioProfile === "BIKE" && input.rpm !== null) {
      if (!Number.isInteger(input.rpm) || input.rpm < MIN_RPM || input.rpm > MAX_RPM) {
        errors.rpm = `El RPM debe estar entre ${MIN_RPM} y ${MAX_RPM}.`;
      }
    }
  } else if (!input.intensityLabel) {
    errors.intensityLabel = "Selecciona la intensidad.";
  }

  return errors;
}
