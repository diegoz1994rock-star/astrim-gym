import type { ExerciseConfigInput, ExerciseConfigErrors } from "@/types/exerciseConfig";
import type { CardioEquipmentProfile, ExerciseConfigurationMode } from "./exerciseConfigMode";

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

/**
 * Valida los campos numéricos de un ejercicio según su modo. No sabe nada de
 * qué ejercicio es (eso lo valida quien lo llame): solo revisa que los
 * valores del modo activo sean coherentes. La usan Rutinas y Clases igual.
 */
export function validateExerciseConfig(
  input: ExerciseConfigInput,
  mode: ExerciseConfigurationMode = "STRENGTH",
  cardioProfile: CardioEquipmentProfile = "GENERIC",
): ExerciseConfigErrors {
  const errors: ExerciseConfigErrors = {};

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
