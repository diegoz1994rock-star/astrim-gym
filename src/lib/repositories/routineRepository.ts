import { getDb } from "../db/client";
import type { RoutineExerciseRow, RoutineRow, RoutineStatus } from "@/types/db";

const ROUTINE_SELECT = `
  SELECT
    r.id, r.gym_id, r.client_id, c.name AS client_name, c.document AS client_document,
    r.name, r.description, r.start_date, r.end_date, r.status, r.notes,
    r.created_at, r.updated_at,
    (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = r.id) AS exercise_count
  FROM routines r
  JOIN clients c ON c.id = r.client_id
`;

export async function listRoutines(gymId: string): Promise<RoutineRow[]> {
  const db = await getDb();
  return db.select<RoutineRow[]>(
    `${ROUTINE_SELECT} WHERE r.gym_id = $1 ORDER BY r.created_at DESC`,
    [gymId],
  );
}

export async function listRoutinesByClient(gymId: string, clientId: string): Promise<RoutineRow[]> {
  const db = await getDb();
  return db.select<RoutineRow[]>(
    `${ROUTINE_SELECT} WHERE r.gym_id = $1 AND r.client_id = $2 ORDER BY r.created_at DESC`,
    [gymId, clientId],
  );
}

export async function findRoutineById(gymId: string, id: string): Promise<RoutineRow | null> {
  const db = await getDb();
  const rows = await db.select<RoutineRow[]>(
    `${ROUTINE_SELECT} WHERE r.gym_id = $1 AND r.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

export interface CreateRoutineInput {
  clientId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: RoutineStatus;
  notes: string | null;
}

export async function createRoutine(
  gymId: string,
  id: string,
  input: CreateRoutineInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO routines (id, gym_id, client_id, name, description, start_date, end_date, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      gymId,
      input.clientId,
      input.name,
      input.description,
      input.startDate,
      input.endDate,
      input.status,
      input.notes,
    ],
  );
}

export async function updateRoutine(
  gymId: string,
  id: string,
  input: CreateRoutineInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE routines SET
       client_id = $1, name = $2, description = $3, start_date = $4, end_date = $5,
       status = $6, notes = $7, updated_at = datetime('now')
     WHERE id = $8 AND gym_id = $9`,
    [
      input.clientId,
      input.name,
      input.description,
      input.startDate,
      input.endDate,
      input.status,
      input.notes,
      id,
      gymId,
    ],
  );
}

export async function setRoutineStatus(
  gymId: string,
  id: string,
  status: RoutineStatus,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE routines SET status = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [status, id, gymId],
  );
}

// ---- Ejercicios de la rutina ----

const ROUTINE_EXERCISE_SELECT = `
  SELECT re.id, re.routine_id, re.exercise_id, ex.name AS exercise_name,
         ex.exercise_type, ex.equipment,
         re.sets, re.reps, re.weight, re.rest_seconds, re.notes,
         re.time_value, re.time_unit, re.speed_kmh, re.incline_percent,
         re.resistance_level, re.rpm, re.intensity_label, re.sort_order
  FROM routine_exercises re
  JOIN exercises ex ON ex.id = re.exercise_id
`;

/**
 * routine_exercises no lleva gym_id propio; se protege verificando que la
 * rutina (que sí es gym_id-scoped) pertenezca al gimnasio antes de leer o
 * escribir sus ejercicios — ver routineService.
 */
export async function listRoutineExercises(routineId: string): Promise<RoutineExerciseRow[]> {
  const db = await getDb();
  return db.select<RoutineExerciseRow[]>(
    `${ROUTINE_EXERCISE_SELECT} WHERE re.routine_id = $1 ORDER BY re.sort_order ASC`,
    [routineId],
  );
}

export interface RoutineExercisePersistedFields {
  exerciseId: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  restSeconds: number | null;
  notes: string | null;
  timeValue: number | null;
  timeUnit: string | null;
  speedKmh: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  rpm: number | null;
  intensityLabel: string | null;
}

export interface AddRoutineExerciseInput extends RoutineExercisePersistedFields {
  routineId: string;
  sortOrder: number;
}

export async function addRoutineExercise(id: string, input: AddRoutineExerciseInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO routine_exercises (
       id, routine_id, exercise_id, sets, reps, weight, rest_seconds, notes,
       time_value, time_unit, speed_kmh, incline_percent, resistance_level, rpm,
       intensity_label, sort_order
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      id,
      input.routineId,
      input.exerciseId,
      input.sets,
      input.reps,
      input.weight,
      input.restSeconds,
      input.notes,
      input.timeValue,
      input.timeUnit,
      input.speedKmh,
      input.inclinePercent,
      input.resistanceLevel,
      input.rpm,
      input.intensityLabel,
      input.sortOrder,
    ],
  );
}

export async function updateRoutineExercise(
  routineId: string,
  id: string,
  input: RoutineExercisePersistedFields,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE routine_exercises SET
       exercise_id = $1, sets = $2, reps = $3, weight = $4, rest_seconds = $5, notes = $6,
       time_value = $7, time_unit = $8, speed_kmh = $9, incline_percent = $10,
       resistance_level = $11, rpm = $12, intensity_label = $13
     WHERE id = $14 AND routine_id = $15`,
    [
      input.exerciseId,
      input.sets,
      input.reps,
      input.weight,
      input.restSeconds,
      input.notes,
      input.timeValue,
      input.timeUnit,
      input.speedKmh,
      input.inclinePercent,
      input.resistanceLevel,
      input.rpm,
      input.intensityLabel,
      id,
      routineId,
    ],
  );
}

export async function removeRoutineExercise(routineId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM routine_exercises WHERE id = $1 AND routine_id = $2`, [
    id,
    routineId,
  ]);
}

export async function getNextSortOrder(routineId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ next: number }[]>(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM routine_exercises WHERE routine_id = $1`,
    [routineId],
  );
  return rows[0]?.next ?? 1;
}
