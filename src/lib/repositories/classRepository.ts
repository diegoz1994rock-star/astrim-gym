import { getDb } from "../db/client";
import type {
  ClassBlockExerciseRow,
  ClassBlockRow,
  ClassEnrollmentRow,
  ClassRow,
  ClassStatus,
  ClassTypeRow,
} from "@/types/db";
import type { ClassBlockFormInput } from "@/types/class";

const CLASS_SELECT = `
  SELECT
    c.id, c.gym_id, c.class_type_id, ct.name AS class_type_name,
    c.trainer_id, t.name AS trainer_name,
    c.name, c.date, c.start_time, c.end_time, c.capacity, c.status,
    c.description, c.notes, c.recurrence_group_id,
    (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.status = 'ENROLLED') AS enrolled_count
  FROM classes c
  JOIN class_types ct ON ct.id = c.class_type_id
  LEFT JOIN trainers t ON t.id = c.trainer_id
`;

export async function listClassTypes(gymId: string): Promise<ClassTypeRow[]> {
  const db = await getDb();
  return db.select<ClassTypeRow[]>(
    `SELECT id, gym_id, name, status FROM class_types
     WHERE status = 'ACTIVE' AND (gym_id IS NULL OR gym_id = $1)
     ORDER BY name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function listClassesByDateRange(gymId: string, from: string, to: string): Promise<ClassRow[]> {
  const db = await getDb();
  return db.select<ClassRow[]>(
    `${CLASS_SELECT} WHERE c.gym_id = $1 AND c.date BETWEEN $2 AND $3
     ORDER BY c.date ASC, c.start_time ASC`,
    [gymId, from, to],
  );
}

export async function findClassById(gymId: string, id: string): Promise<ClassRow | null> {
  const db = await getDb();
  const rows = await db.select<ClassRow[]>(`${CLASS_SELECT} WHERE c.gym_id = $1 AND c.id = $2 LIMIT 1`, [
    gymId,
    id,
  ]);
  return rows[0] ?? null;
}

export interface ClassHeaderInput {
  classTypeId: string;
  trainerId: string | null;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: ClassStatus;
  description: string;
  notes: string;
  recurrenceGroupId: string | null;
}

export async function createClass(gymId: string, id: string, input: ClassHeaderInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO classes (
       id, gym_id, class_type_id, trainer_id, name, date, start_time, end_time,
       capacity, status, description, notes, recurrence_group_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      gymId,
      input.classTypeId,
      input.trainerId,
      input.name.trim(),
      input.date,
      input.startTime,
      input.endTime,
      input.capacity,
      input.status,
      input.description.trim() || null,
      input.notes.trim() || null,
      input.recurrenceGroupId,
    ],
  );
}

export async function updateClass(gymId: string, id: string, input: ClassHeaderInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE classes SET
       class_type_id = $1, trainer_id = $2, name = $3, date = $4, start_time = $5,
       end_time = $6, capacity = $7, status = $8, description = $9, notes = $10,
       updated_at = datetime('now')
     WHERE id = $11 AND gym_id = $12`,
    [
      input.classTypeId,
      input.trainerId,
      input.name.trim(),
      input.date,
      input.startTime,
      input.endTime,
      input.capacity,
      input.status,
      input.description.trim() || null,
      input.notes.trim() || null,
      id,
      gymId,
    ],
  );
}

export async function setClassStatus(gymId: string, id: string, status: ClassStatus): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE classes SET status = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [status, id, gymId],
  );
}

const BLOCK_EXERCISE_SELECT = `
  SELECT cbe.id, cbe.block_id, cbe.exercise_id, e.name AS exercise_name,
    e.exercise_type, e.equipment,
    cbe.sets, cbe.reps, cbe.weight, cbe.rest_seconds, cbe.notes,
    cbe.time_value, cbe.time_unit, cbe.speed_kmh, cbe.incline_percent,
    cbe.resistance_level, cbe.rpm, cbe.intensity_label,
    cbe.sort_order
  FROM class_block_exercises cbe
  JOIN exercises e ON e.id = cbe.exercise_id
`;

export async function listBlocks(classId: string): Promise<ClassBlockRow[]> {
  const db = await getDb();
  return db.select<ClassBlockRow[]>(
    `SELECT id, class_id, name, block_type, sort_order FROM class_blocks
     WHERE class_id = $1 ORDER BY sort_order ASC`,
    [classId],
  );
}

/**
 * Todos los ejercicios de todos los bloques de la clase en una sola
 * consulta (evita N+1 al armar el detalle), agrupados por bloque después
 * en el servicio.
 */
export async function listBlockExercisesForClass(classId: string): Promise<ClassBlockExerciseRow[]> {
  const db = await getDb();
  return db.select<ClassBlockExerciseRow[]>(
    `${BLOCK_EXERCISE_SELECT}
     WHERE cbe.block_id IN (SELECT id FROM class_blocks WHERE class_id = $1)
     ORDER BY cbe.sort_order ASC`,
    [classId],
  );
}

/**
 * Reemplaza por completo los bloques y ejercicios de una clase. Editar
 * una clase siempre reenvía la estructura completa desde el formulario,
 * así que borrar-y-reinsertar es más simple y confiable que calcular un
 * diff — no hay reordenamiento parcial que preservar entre bloques.
 */
export async function replaceClassBlocks(classId: string, blocks: ClassBlockFormInput[]): Promise<void> {
  const db = await getDb();
  await db.execute(
    `DELETE FROM class_block_exercises WHERE block_id IN (SELECT id FROM class_blocks WHERE class_id = $1)`,
    [classId],
  );
  await db.execute(`DELETE FROM class_blocks WHERE class_id = $1`, [classId]);

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    const blockId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO class_blocks (id, class_id, name, block_type, sort_order) VALUES ($1,$2,$3,$4,$5)`,
      [blockId, classId, block.name.trim(), block.blockType, blockIndex],
    );
    for (let exIndex = 0; exIndex < block.exercises.length; exIndex += 1) {
      const exercise = block.exercises[exIndex];
      await db.execute(
        `INSERT INTO class_block_exercises (
           id, block_id, exercise_id, sets, reps, weight, rest_seconds, notes,
           time_value, time_unit, speed_kmh, incline_percent, resistance_level, rpm, intensity_label,
           sort_order
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          crypto.randomUUID(),
          blockId,
          exercise.exerciseId,
          exercise.sets,
          exercise.reps,
          exercise.weight,
          exercise.restSeconds,
          exercise.notes.trim() || null,
          exercise.timeValue,
          exercise.timeUnit,
          exercise.speedKmh,
          exercise.inclinePercent,
          exercise.resistanceLevel,
          exercise.rpm,
          exercise.intensityLabel,
          exIndex,
        ],
      );
    }
  }
}

const ENROLLMENT_SELECT = `
  SELECT ce.id, ce.class_id, ce.client_id, c.name AS client_name, c.document AS client_document
  FROM class_enrollments ce
  JOIN clients c ON c.id = ce.client_id
`;

export async function listEnrollments(classId: string): Promise<ClassEnrollmentRow[]> {
  const db = await getDb();
  return db.select<ClassEnrollmentRow[]>(
    `${ENROLLMENT_SELECT} WHERE ce.class_id = $1 AND ce.status = 'ENROLLED' ORDER BY c.name COLLATE NOCASE ASC`,
    [classId],
  );
}

export async function countEnrolled(classId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM class_enrollments WHERE class_id = $1 AND status = 'ENROLLED'`,
    [classId],
  );
  return rows[0]?.count ?? 0;
}

/** Reemplaza por completo la lista de inscritos, igual que replaceClassBlocks. */
export async function replaceClassRoster(classId: string, clientIds: string[]): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM class_enrollments WHERE class_id = $1`, [classId]);
  for (const clientId of clientIds) {
    await db.execute(
      `INSERT INTO class_enrollments (id, class_id, client_id, status) VALUES ($1,$2,$3,'ENROLLED')`,
      [crypto.randomUUID(), classId, clientId],
    );
  }
}
