import * as exerciseRepository from "../repositories/exerciseRepository";
import { validateExerciseForm, hasValidationErrors } from "../domain/exerciseValidation";
import type { ExerciseValidationErrors } from "../domain/exerciseValidation";
import type { ExerciseFormInput, ExerciseListItem } from "@/types/exercise";
import type { ExerciseOptionRow, ExerciseRow, ExerciseStatus } from "@/types/db";

export class ExerciseValidationError extends Error {
  constructor(public errors: ExerciseValidationErrors) {
    super("Los datos del ejercicio no son válidos.");
  }
}

function mapRowToListItem(row: ExerciseRow): ExerciseListItem {
  return {
    id: row.id,
    isGlobal: row.gym_id === null,
    name: row.name,
    category: row.category,
    description: row.description,
    muscleGroup: row.muscle_group as ExerciseListItem["muscleGroup"],
    secondaryMuscles: row.secondary_muscles,
    exerciseType: row.exercise_type as ExerciseListItem["exerciseType"],
    equipment: row.equipment,
    level: row.level,
    instructions: row.instructions,
    videoPath: row.video_path,
    status: row.status,
  };
}

/** Sin cambios: usado por Rutinas para el selector de ejercicios. */
export async function getExerciseOptions(gymId: string): Promise<ExerciseOptionRow[]> {
  return exerciseRepository.listExerciseOptions(gymId);
}

export async function getExercises(gymId: string): Promise<ExerciseListItem[]> {
  const rows = await exerciseRepository.listExercises(gymId);
  return rows.map(mapRowToListItem);
}

export async function getExerciseById(gymId: string, id: string): Promise<ExerciseListItem | null> {
  const row = await exerciseRepository.findExerciseByIdFull(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

async function assertUniqueName(
  gymId: string,
  name: string,
  excludeId?: string,
): Promise<ExerciseValidationErrors> {
  const existing = await exerciseRepository.findExerciseByName(gymId, name.trim(), excludeId);
  if (existing) {
    return { name: "Ya existe un ejercicio con este nombre en el gimnasio." };
  }
  return {};
}

export async function createExercise(gymId: string, input: ExerciseFormInput): Promise<string> {
  const errors = validateExerciseForm(input);
  if (!errors.name) {
    Object.assign(errors, await assertUniqueName(gymId, input.name));
  }
  if (hasValidationErrors(errors)) throw new ExerciseValidationError(errors);

  const id = crypto.randomUUID();
  await exerciseRepository.createExercise(gymId, id, input);
  return id;
}

export async function updateExercise(
  gymId: string,
  id: string,
  input: ExerciseFormInput,
): Promise<void> {
  // Se busca el ejercicio actual para permitir conservar una categoría
  // histórica fuera del catálogo si no fue modificada (mismo patrón que
  // Rutinas con allowedName/allowedDescription).
  const current = await exerciseRepository.findExerciseByIdFull(gymId, id);

  const errors = validateExerciseForm(input, { allowedCategory: current?.category ?? null });
  if (!errors.name) {
    Object.assign(errors, await assertUniqueName(gymId, input.name, id));
  }
  if (hasValidationErrors(errors)) throw new ExerciseValidationError(errors);

  await exerciseRepository.updateExercise(gymId, id, input);
}

export async function setExerciseStatus(
  gymId: string,
  id: string,
  status: ExerciseStatus,
): Promise<void> {
  await exerciseRepository.setExerciseStatus(gymId, id, status);
}
