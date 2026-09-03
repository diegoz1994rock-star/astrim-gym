import { getDb } from "../db/client";
import type { ExerciseOptionRow, ExerciseRow, ExerciseStatus } from "@/types/db";
import type { ExerciseFormInput } from "@/types/exercise";

/**
 * Usado por Rutinas para poblar el selector de ejercicios. Incluye los
 * globales (gym_id NULL) y los propios del gimnasio actual. NO tocar su
 * forma de retorno (ExerciseOptionRow): RoutineExerciseFormModal depende
 * exactamente de estos tres campos.
 */
export async function listExerciseOptions(gymId: string): Promise<ExerciseOptionRow[]> {
  const db = await getDb();
  return db.select<ExerciseOptionRow[]>(
    `SELECT id, name, category, muscle_group, exercise_type, equipment FROM exercises
     WHERE gym_id IS NULL OR gym_id = $1
     ORDER BY category COLLATE NOCASE ASC, name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function findExerciseById(
  gymId: string,
  id: string,
): Promise<ExerciseOptionRow | null> {
  const db = await getDb();
  const rows = await db.select<ExerciseOptionRow[]>(
    `SELECT id, name, category, muscle_group, exercise_type, equipment FROM exercises
     WHERE id = $1 AND (gym_id IS NULL OR gym_id = $2)
     LIMIT 1`,
    [id, gymId],
  );
  return rows[0] ?? null;
}

const EXERCISE_SELECT = `
  SELECT id, gym_id, name, category, description, muscle_group, secondary_muscles,
         level, exercise_type, equipment, instructions, video_path, status
  FROM exercises
`;

/** Catálogo completo: globales + propios del gimnasio (los globales se muestran de solo lectura en la UI). */
export async function listExercises(gymId: string): Promise<ExerciseRow[]> {
  const db = await getDb();
  return db.select<ExerciseRow[]>(
    `${EXERCISE_SELECT} WHERE gym_id IS NULL OR gym_id = $1 ORDER BY name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function findExerciseByIdFull(gymId: string, id: string): Promise<ExerciseRow | null> {
  const db = await getDb();
  const rows = await db.select<ExerciseRow[]>(
    `${EXERCISE_SELECT} WHERE id = $1 AND (gym_id IS NULL OR gym_id = $2) LIMIT 1`,
    [id, gymId],
  );
  return rows[0] ?? null;
}

/** La unicidad de nombre solo aplica a ejercicios propios del gimnasio (ver migración 0008). */
export async function findExerciseByName(
  gymId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM exercises WHERE gym_id = $1 AND name = $2 COLLATE NOCASE AND id != $3 LIMIT 1`,
    [gymId, name, excludeId ?? ""],
  );
  return rows[0] ?? null;
}

/** Los ejercicios creados desde este módulo siempre quedan asociados al gimnasio actual (nunca globales). */
export async function createExercise(
  gymId: string,
  id: string,
  input: ExerciseFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO exercises (
       id, gym_id, name, category, description, muscle_group, secondary_muscles,
       level, exercise_type, equipment, instructions, video_path, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      gymId,
      input.name.trim(),
      input.category || null,
      input.description.trim() || null,
      input.muscleGroup,
      input.secondaryMuscles.trim() || null,
      input.level,
      input.exerciseType,
      input.equipment.trim() || null,
      input.instructions.trim() || null,
      input.videoPath.trim() || null,
      input.status,
    ],
  );
}

/**
 * Decisión explícita del administrador (2026-08-29): los ejercicios
 * globales (gym_id NULL) ahora SÍ pueden editarse desde cualquier
 * gimnasio, a sabiendas de que es una única fila compartida — el cambio
 * se ve reflejado para todos los gimnasios que usan ese mismo ejercicio,
 * no solo para el que lo edita. "gym_id IS NULL OR gym_id = $gymId" sigue
 * bloqueando estrictamente la edición de ejercicios de OTRO gimnasio.
 */
export async function updateExercise(
  gymId: string,
  id: string,
  input: ExerciseFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE exercises SET
       name = $1, category = $2, description = $3, muscle_group = $4, secondary_muscles = $5,
       level = $6, exercise_type = $7, equipment = $8, instructions = $9, video_path = $10,
       status = $11, updated_at = datetime('now')
     WHERE id = $12 AND (gym_id IS NULL OR gym_id = $13)`,
    [
      input.name.trim(),
      input.category || null,
      input.description.trim() || null,
      input.muscleGroup,
      input.secondaryMuscles.trim() || null,
      input.level,
      input.exerciseType,
      input.equipment.trim() || null,
      input.instructions.trim() || null,
      input.videoPath.trim() || null,
      input.status,
      id,
      gymId,
    ],
  );
}

export async function setExerciseStatus(
  gymId: string,
  id: string,
  status: ExerciseStatus,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE exercises SET status = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [status, id, gymId],
  );
}
