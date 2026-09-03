import { getDb } from "../db/client";
import type { TrainerOptionRow, TrainerRow, TrainerStatus } from "@/types/db";
import type { TrainerFormInput } from "@/types/trainer";

const TRAINER_SELECT = `
  SELECT
    t.id, t.gym_id, t.name, t.document, t.birth_date, t.phone, t.email, t.address,
    t.specialty, t.description, t.photo_path, t.join_date, t.observations, t.status,
    (SELECT COUNT(*) FROM clients c WHERE c.trainer_id = t.id AND c.gym_id = t.gym_id) AS client_count
  FROM trainers t
`;

/** Lista liviana (id, name) usada por el selector de entrenador en el formulario de Clientes. */
export async function listActiveTrainers(gymId: string): Promise<TrainerOptionRow[]> {
  const db = await getDb();
  return db.select<TrainerOptionRow[]>(
    `SELECT id, name FROM trainers WHERE gym_id = $1 AND status = 'ACTIVE' ORDER BY name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function listTrainers(gymId: string): Promise<TrainerRow[]> {
  const db = await getDb();
  return db.select<TrainerRow[]>(
    `${TRAINER_SELECT} WHERE t.gym_id = $1 ORDER BY t.name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function findTrainerById(gymId: string, id: string): Promise<TrainerRow | null> {
  const db = await getDb();
  const rows = await db.select<TrainerRow[]>(
    `${TRAINER_SELECT} WHERE t.gym_id = $1 AND t.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

export async function findTrainerByDocument(
  gymId: string,
  document: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM trainers WHERE gym_id = $1 AND document = $2 AND id != $3 LIMIT 1`,
    [gymId, document, excludeId ?? ""],
  );
  return rows[0] ?? null;
}

export async function createTrainer(
  gymId: string,
  id: string,
  input: TrainerFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO trainers (
       id, gym_id, name, document, birth_date, phone, email, address,
       specialty, description, photo_path, join_date, observations, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      id,
      gymId,
      input.name.trim(),
      input.document.trim(),
      input.birthDate,
      input.phone.trim() || null,
      input.email.trim() || null,
      input.address.trim() || null,
      input.specialty.trim() || null,
      input.description.trim() || null,
      input.photoPath,
      input.joinDate,
      input.observations.trim() || null,
      input.status,
    ],
  );
}

export async function updateTrainer(
  gymId: string,
  id: string,
  input: TrainerFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE trainers SET
       name = $1, document = $2, birth_date = $3, phone = $4, email = $5,
       address = $6, specialty = $7, description = $8, photo_path = $9,
       join_date = $10, observations = $11, status = $12, updated_at = datetime('now')
     WHERE id = $13 AND gym_id = $14`,
    [
      input.name.trim(),
      input.document.trim(),
      input.birthDate,
      input.phone.trim() || null,
      input.email.trim() || null,
      input.address.trim() || null,
      input.specialty.trim() || null,
      input.description.trim() || null,
      input.photoPath,
      input.joinDate,
      input.observations.trim() || null,
      input.status,
      id,
      gymId,
    ],
  );
}

export async function setTrainerStatus(
  gymId: string,
  id: string,
  status: TrainerStatus,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE trainers SET status = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [status, id, gymId],
  );
}
