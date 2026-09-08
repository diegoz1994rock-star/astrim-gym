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

// `video_path` ya no vive en `exercises` (siempre NULL desde la migración
// 0028). Se trae con LEFT JOIN el video PROPIO de este gimnasio desde
// `exercise_videos`, así el resto del código que lee `row.video_path` sigue
// funcionando y muestra el video correcto (o ninguno) por gimnasio.
const EXERCISE_COLS = `
  e.id, e.gym_id, e.name, e.category, e.description, e.muscle_group, e.secondary_muscles,
  e.level, e.exercise_type, e.equipment, e.instructions, ev.video_url AS video_path, e.status
`;

/** Catálogo completo: globales + propios del gimnasio (los globales se muestran de solo lectura en la UI). */
export async function listExercises(gymId: string): Promise<ExerciseRow[]> {
  const db = await getDb();
  return db.select<ExerciseRow[]>(
    `SELECT ${EXERCISE_COLS}
     FROM exercises e
     LEFT JOIN exercise_videos ev ON ev.exercise_id = e.id AND ev.gym_id = $1
     WHERE e.gym_id IS NULL OR e.gym_id = $1
     ORDER BY e.name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function findExerciseByIdFull(gymId: string, id: string): Promise<ExerciseRow | null> {
  const db = await getDb();
  const rows = await db.select<ExerciseRow[]>(
    `SELECT ${EXERCISE_COLS}
     FROM exercises e
     LEFT JOIN exercise_videos ev ON ev.exercise_id = e.id AND ev.gym_id = $2
     WHERE e.id = $1 AND (e.gym_id IS NULL OR e.gym_id = $2) LIMIT 1`,
    [id, gymId],
  );
  return rows[0] ?? null;
}

/**
 * Video del ejercicio PARA ESTE GIMNASIO. `url` vacío/null borra el video.
 * El catálogo (`exercises`) nunca guarda video — cada gimnasio pone el suyo.
 */
export async function setExerciseVideo(
  gymId: string,
  exerciseId: string,
  url: string | null,
): Promise<void> {
  const db = await getDb();
  const trimmed = url?.trim() ?? "";
  if (trimmed) {
    await db.execute(
      `INSERT INTO exercise_videos (id, gym_id, exercise_id, video_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (gym_id, exercise_id)
       DO UPDATE SET video_url = excluded.video_url, updated_at = datetime('now')`,
      [crypto.randomUUID(), gymId, exerciseId, trimmed],
    );
  } else {
    await db.execute(
      `DELETE FROM exercise_videos WHERE gym_id = $1 AND exercise_id = $2`,
      [gymId, exerciseId],
    );
  }
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
       level, exercise_type, equipment, instructions, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
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
      input.status,
    ],
  );
  await setExerciseVideo(gymId, id, input.videoPath);
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
       level = $6, exercise_type = $7, equipment = $8, instructions = $9,
       status = $10, updated_at = datetime('now')
     WHERE id = $11 AND (gym_id IS NULL OR gym_id = $12)`,
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
      input.status,
      id,
      gymId,
    ],
  );
  await setExerciseVideo(gymId, id, input.videoPath);
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
