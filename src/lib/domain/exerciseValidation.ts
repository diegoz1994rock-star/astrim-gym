import { EXERCISE_CATEGORY_OPTIONS, type ExerciseFormInput } from "@/types/exercise";
import { hasValidationErrors } from "./validation";
import { isValidVideoUrl } from "./videoUrl";

export type ExerciseValidationErrors = Partial<Record<keyof ExerciseFormInput, string>>;
export { hasValidationErrors };

const MAX_NAME_LENGTH = 120;
const MAX_INSTRUCTIONS_LENGTH = 4000;

export interface ExerciseFormValidationOptions {
  /** Categoría ya guardada en el ejercicio (permite conservar una
   * categoría histórica fuera de catálogo si no fue modificada). */
  allowedCategory?: string | null;
}

export function validateExerciseForm(
  input: ExerciseFormInput,
  options: ExerciseFormValidationOptions = {},
): ExerciseValidationErrors {
  const errors: ExerciseValidationErrors = {};

  const name = input.name.trim();
  if (!name) {
    errors.name = "El nombre del ejercicio es obligatorio.";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  const category = input.category?.trim() ?? "";
  if (
    category &&
    !EXERCISE_CATEGORY_OPTIONS.includes(category) &&
    category !== options.allowedCategory
  ) {
    errors.category = "Selecciona una categoría válida del catálogo.";
  }

  const videoPath = input.videoPath.trim();
  if (videoPath && !isValidVideoUrl(videoPath)) {
    errors.videoPath = "Ingresa una URL de video válida (debe comenzar con http:// o https://).";
  }

  if (input.instructions.trim().length > MAX_INSTRUCTIONS_LENGTH) {
    errors.instructions = `Las instrucciones no pueden superar los ${MAX_INSTRUCTIONS_LENGTH} caracteres.`;
  }

  return errors;
}

/**
 * Misma regla usada para comparar nombres de planes de membresía (0005):
 * insensible a mayúsculas/minúsculas y a espacios sobrantes. La
 * comparación real contra la base de datos vive en el repositorio
 * (COLLATE NOCASE); esta función documenta y prueba esa misma regla
 * a nivel de dominio, sin depender de SQLite.
 */
export function namesAreEqualIgnoringCase(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
