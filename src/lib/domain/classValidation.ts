import type { ClassFormInput } from "@/types/class";
import type { ExerciseOptionRow } from "@/types/db";
import { hasValidationErrors } from "./validation";
import { validateExerciseConfig } from "./exerciseConfigValidation";
import {
  getCardioEquipmentProfile,
  getExerciseConfigurationMode,
  hasLegacyStrengthValues,
  resolveEffectiveMode,
} from "./exerciseConfigMode";

export { hasValidationErrors };

export type ClassValidationErrors = Partial<
  Record<"name" | "classTypeId" | "date" | "startTime" | "endTime" | "capacity" | "clientIds" | "blocks" | "repeat", string>
>;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Validación síncrona y pura del formulario de clase. La verificación de
 * cupo contra inscripciones reales requiere consultar la base de datos,
 * así que eso se valida en classService, no aquí (igual que la unicidad
 * de documento en clientValidation).
 */
export function validateClassForm(
  input: ClassFormInput,
  catalog: ExerciseOptionRow[] = [],
): ClassValidationErrors {
  const errors: ClassValidationErrors = {};
  const byId = new Map(catalog.map((e) => [e.id, e]));

  if (!input.name.trim()) {
    errors.name = "El nombre de la clase es obligatorio.";
  }

  if (!input.classTypeId) {
    errors.classTypeId = "Selecciona un tipo de clase.";
  }

  if (!input.date) {
    errors.date = "La fecha es obligatoria.";
  }

  if (!input.startTime) {
    errors.startTime = "La hora de inicio es obligatoria.";
  }

  if (!input.endTime) {
    errors.endTime = "La hora de finalización es obligatoria.";
  } else if (input.startTime && toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    errors.endTime = "La hora de finalización debe ser posterior a la de inicio.";
  }

  if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
    errors.capacity = "El cupo debe ser un número mayor a cero.";
  }

  if (new Set(input.clientIds).size !== input.clientIds.length) {
    errors.clientIds = "Hay clientes duplicados en la lista.";
  } else if (input.clientIds.length > input.capacity) {
    errors.clientIds = "Hay más clientes inscritos que el cupo máximo.";
  }

  for (const block of input.blocks) {
    const exerciseIds = block.exercises.map((e) => e.exerciseId).filter(Boolean);
    if (new Set(exerciseIds).size !== exerciseIds.length) {
      errors.blocks = `El bloque "${block.name}" tiene ejercicios repetidos.`;
      break;
    }
    // Cada ejercicio se valida según su tipo (fuerza vs. cardio), igual que
    // en Rutinas. Se usa el catálogo para saber el modo.
    let stop = false;
    for (const ex of block.exercises) {
      const cat = byId.get(ex.exerciseId);
      if (!cat) continue;
      const mode = resolveEffectiveMode(
        hasLegacyStrengthValues(ex),
        getExerciseConfigurationMode(cat.exercise_type),
      );
      const configErrors = validateExerciseConfig(ex, mode, getCardioEquipmentProfile(cat.equipment));
      const firstError = Object.values(configErrors)[0];
      if (firstError) {
        errors.blocks = `"${cat.name}" en el bloque "${block.name}": ${firstError}`;
        stop = true;
        break;
      }
    }
    if (stop) break;
  }

  if (input.repeat) {
    if (input.repeat.frequency === "WEEKLY" && input.repeat.weekdays.length === 0) {
      errors.repeat = "Selecciona al menos un día de la semana.";
    } else if (!input.repeat.until) {
      errors.repeat = "Selecciona hasta cuándo se repite la clase.";
    } else if (input.repeat.until < input.date) {
      errors.repeat = "La fecha final debe ser posterior a la fecha de la clase.";
    }
  }

  return errors;
}
