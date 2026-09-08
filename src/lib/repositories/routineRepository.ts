import { getDb } from "../db/client";
import type { ClientRoutineRow, RoutineAssignmentRow, RoutineExerciseRow, RoutineRow, RoutineStatus } from "@/types/db";

const ROUTINE_SELECT = `
  SELECT
    r.id, r.gym_id, r.name, r.description, r.status, r.notes,
    r.created_at, r.updated_at,
    (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = r.id) AS exercise_count,
    (SELECT COUNT(*) FROM routine_assignments ra WHERE ra.routine_id = r.id) AS assignment_count
  FROM routines r
`;

export async function listRoutines(gymId: string): Promise<RoutineRow[]> {
  const db = await getDb();
  return db.select<RoutineRow[]>(
    `${ROUTINE_SELECT} WHERE r.gym_id = $1 ORDER BY r.created_at DESC`,
    [gymId],
  );
}

/** Rutinas asignadas a un cliente, cada una con la vigencia de SU asignación. */
export async function listRoutinesByClient(gymId: string, clientId: string): Promise<ClientRoutineRow[]> {
  const db = await getDb();
  return db.select<ClientRoutineRow[]>(
    `SELECT r.id, r.name, r.description, r.status, r.notes,
       (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = r.id) AS exercise_count,
       ra.start_date, ra.end_date
     FROM routine_assignments ra
     JOIN routines r ON r.id = ra.routine_id
     WHERE ra.client_id = $1 AND r.gym_id = $2
     ORDER BY ra.created_at DESC`,
    [clientId, gymId],
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
  name: string;
  description: string | null;
  status: RoutineStatus;
  notes: string | null;
}

/**
 * La rutina nace sin cliente ni vigencia: es una plantilla reutilizable.
 * Se asigna a clientes por separado (posiblemente a varios a la vez), ver
 * upsertRoutineAssignment.
 */
export async function createRoutine(
  gymId: string,
  id: string,
  input: CreateRoutineInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO routines (id, gym_id, name, description, status, notes) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, gymId, input.name, input.description, input.status, input.notes],
  );
}

export async function updateRoutineDetails(
  gymId: string,
  id: string,
  input: CreateRoutineInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE routines SET
       name = $1, description = $2, status = $3, notes = $4, updated_at = datetime('now')
     WHERE id = $5 AND gym_id = $6`,
    [input.name, input.description, input.status, input.notes, id, gymId],
  );
}

/**
 * Borra la rutina y todo lo que solo tiene sentido junto a ella: sus
 * ejercicios y sus asignaciones a clientes. No toca a los clientes en sí.
 */
export async function deleteRoutine(gymId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `DELETE FROM routine_exercises WHERE routine_id = $1`,
    [id],
  );
  await db.execute(`DELETE FROM routine_assignments WHERE routine_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM routines WHERE id = $1 AND gym_id = $2`, [id, gymId]);
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

// ---- Asignaciones (cliente + vigencia) ----

const ROUTINE_ASSIGNMENT_SELECT = `
  SELECT ra.id, ra.routine_id, ra.client_id, c.name AS client_name, c.document AS client_document,
         ra.start_date, ra.end_date, ra.created_at
  FROM routine_assignments ra
  JOIN clients c ON c.id = ra.client_id
`;

export async function listAssignmentsByRoutine(routineId: string): Promise<RoutineAssignmentRow[]> {
  const db = await getDb();
  return db.select<RoutineAssignmentRow[]>(
    `${ROUTINE_ASSIGNMENT_SELECT} WHERE ra.routine_id = $1 ORDER BY c.name COLLATE NOCASE ASC`,
    [routineId],
  );
}

export interface AssignRoutineInput {
  clientId: string;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Alta o renovación de UNA asignación cliente-rutina. idx_routine_assignments_unique
 * (routine_id, client_id) hace que reasignar al mismo cliente solo actualice
 * sus fechas en vez de duplicar la fila.
 */
export async function upsertRoutineAssignment(gymId: string, routineId: string, input: AssignRoutineInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO routine_assignments (id, gym_id, routine_id, client_id, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (routine_id, client_id) DO UPDATE SET
       start_date = excluded.start_date, end_date = excluded.end_date, updated_at = datetime('now')`,
    [crypto.randomUUID(), gymId, routineId, input.clientId, input.startDate, input.endDate],
  );
}

export async function removeRoutineAssignment(routineId: string, assignmentId: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM routine_assignments WHERE id = $1 AND routine_id = $2`, [assignmentId, routineId]);
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

/**
 * Marca como modificadas las asignaciones de una rutina para que se
 * re-sincronicen. El conteo de ejercicios (`exerciseCount`) va denormalizado
 * en el doc de la asignación y solo se recalcula cuando esa fila cambia;
 * agregar/quitar un ejercicio no la toca, así que hay que "tocarla" a mano.
 */
async function touchRoutineAssignments(routineId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE routine_assignments SET updated_at = datetime('now') WHERE routine_id = $1`,
    [routineId],
  );
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
  await touchRoutineAssignments(input.routineId);
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
  await touchRoutineAssignments(routineId);
}

export async function getNextSortOrder(routineId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ next: number }[]>(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM routine_exercises WHERE routine_id = $1`,
    [routineId],
  );
  return rows[0]?.next ?? 1;
}
