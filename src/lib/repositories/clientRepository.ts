import { getDb } from "../db/client";
import type { ClientRow } from "@/types/db";
import type { ClientFormInput } from "@/types/client";

const CLIENT_SELECT = `
  SELECT
    c.id, c.gym_id, c.name, c.document, c.birth_date, c.phone, c.email, c.address,
    c.weight, c.height, c.waist, c.chest, c.arm, c.leg, c.calf, c.hip,
    c.body_fat, c.muscle_mass, c.gender, c.goal, c.trainer_id, t.name AS trainer_name,
    c.join_date, c.photo_path, c.observations, c.status, c.attendance_code,
    c.face_consent, c.face_enrolled_at, c.cloud_uid,
    m.id AS membership_id, p.name AS membership_plan_name,
    m.start_date AS membership_start_date, m.end_date AS membership_end_date,
    m.manual_status AS membership_manual_status, m.price AS membership_price
  FROM clients c
  LEFT JOIN trainers t ON t.id = c.trainer_id
  LEFT JOIN memberships m ON m.id = (
    SELECT m2.id FROM memberships m2
    WHERE m2.client_id = c.id
    ORDER BY m2.end_date DESC
    LIMIT 1
  )
  LEFT JOIN membership_plans p ON p.id = m.plan_id
`;

export async function listClients(gymId: string): Promise<ClientRow[]> {
  const db = await getDb();
  return db.select<ClientRow[]>(
    `${CLIENT_SELECT} WHERE c.gym_id = $1 ORDER BY c.name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function findClientById(gymId: string, id: string): Promise<ClientRow | null> {
  const db = await getDb();
  const rows = await db.select<ClientRow[]>(
    `${CLIENT_SELECT} WHERE c.gym_id = $1 AND c.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

export async function findClientByDocument(
  gymId: string,
  document: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM clients WHERE gym_id = $1 AND document = $2 AND id != $3 LIMIT 1`,
    [gymId, document, excludeId ?? ""],
  );
  return rows[0] ?? null;
}

export async function createClient(
  gymId: string,
  id: string,
  input: ClientFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO clients (
       id, gym_id, name, document, birth_date, phone, email, address,
       weight, height, waist, chest, arm, leg, calf, hip, body_fat, muscle_mass,
       gender, goal, trainer_id, join_date, photo_path,
       observations, status, attendance_code
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
    [
      id,
      gymId,
      input.name.trim(),
      input.document.trim(),
      input.birthDate,
      input.phone.trim() || null,
      input.email.trim() || null,
      input.address.trim() || null,
      input.weight,
      input.height,
      input.waist,
      input.chest,
      input.arm,
      input.leg,
      input.calf,
      input.hip,
      input.bodyFat,
      input.muscleMass,
      input.gender,
      input.goal,
      input.trainerId,
      input.joinDate,
      input.photoPath,
      input.observations.trim() || null,
      input.status,
      input.attendanceCode,
    ],
  );
}

export async function updateClient(
  gymId: string,
  id: string,
  input: ClientFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET
       name = $1, document = $2, birth_date = $3, phone = $4, email = $5,
       address = $6, weight = $7, height = $8, waist = $9, chest = $10,
       arm = $11, leg = $12, calf = $13, hip = $14, body_fat = $15, muscle_mass = $16,
       gender = $17, goal = $18, trainer_id = $19, join_date = $20, photo_path = $21,
       observations = $22, status = $23, attendance_code = $24, updated_at = datetime('now')
     WHERE id = $25 AND gym_id = $26`,
    [
      input.name.trim(),
      input.document.trim(),
      input.birthDate,
      input.phone.trim() || null,
      input.email.trim() || null,
      input.address.trim() || null,
      input.weight,
      input.height,
      input.waist,
      input.chest,
      input.arm,
      input.leg,
      input.calf,
      input.hip,
      input.bodyFat,
      input.muscleMass,
      input.gender,
      input.goal,
      input.trainerId,
      input.joinDate,
      input.photoPath,
      input.observations.trim() || null,
      input.status,
      input.attendanceCode,
      id,
      gymId,
    ],
  );
}

/**
 * deactivated_at registra CUÁNDO pasó a INACTIVE (para "bajas por mes" en
 * el Dashboard); se limpia si vuelve a ACTIVE, así siempre refleja la baja
 * vigente, no un historial de idas y vueltas.
 */
export async function setClientStatus(
  gymId: string,
  id: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET status = $1, updated_at = datetime('now'),
       deactivated_at = CASE WHEN $1 = 'INACTIVE' THEN datetime('now') ELSE NULL END
     WHERE id = $2 AND gym_id = $3`,
    [status, id, gymId],
  );
}

/**
 * Elimina al cliente y todo su rastro (membresías, pagos, asistencias,
 * medidas, asignaciones de rutina e inscripciones a clases). No hay FKs con
 * CASCADE en el esquema, así que el borrado de hijos se hace a mano, en el
 * orden que respeta las referencias. Las rutinas en sí (routines,
 * routine_exercises) NO se tocan: son plantillas que pueden estar
 * compartidas con otros clientes, solo se quita la asignación de este.
 */
export async function deleteClient(gymId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM attendance_sync_queue WHERE client_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM attendance WHERE client_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM class_enrollments WHERE client_id = $1`, [id]);
  await db.execute(`DELETE FROM routine_assignments WHERE client_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM measurements WHERE client_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM payments WHERE client_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM memberships WHERE client_id = $1 AND gym_id = $2`, [id, gymId]);
  await db.execute(`DELETE FROM clients WHERE id = $1 AND gym_id = $2`, [id, gymId]);
}

/**
 * Búsqueda usada por el kiosco de recepción: siempre acotada al gimnasio
 * actual, para que un código de un gimnasio nunca funcione en otro.
 */
export async function findClientByAttendanceCode(
  gymId: string,
  attendanceCode: string,
): Promise<ClientRow | null> {
  const db = await getDb();
  const rows = await db.select<ClientRow[]>(
    `${CLIENT_SELECT} WHERE c.gym_id = $1 AND c.attendance_code = $2 LIMIT 1`,
    [gymId, attendanceCode],
  );
  return rows[0] ?? null;
}

export async function getNewClientsCount(gymId: string, startDate: string, endDate: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM clients WHERE gym_id = $1 AND join_date BETWEEN $2 AND $3`,
    [gymId, startDate, endDate],
  );
  return rows[0]?.count ?? 0;
}

export interface MonthlyCountPoint {
  month: string;
  count: number;
}

export async function getNewClientsSeries(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<MonthlyCountPoint[]> {
  const db = await getDb();
  return db.select<MonthlyCountPoint[]>(
    `SELECT strftime('%Y-%m', join_date) AS month, COUNT(*) AS count
     FROM clients
     WHERE gym_id = $1 AND join_date BETWEEN $2 AND $3
     GROUP BY month
     ORDER BY month`,
    [gymId, startDate, endDate],
  );
}

/** Bajas reales por mes, usando deactivated_at (solo existe a partir de la
 * migración que lo introdujo: no hay forma honesta de reconstruir bajas
 * anteriores a esa fecha, así que simplemente no aparecerán). */
export async function getDeactivationsSeries(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<MonthlyCountPoint[]> {
  const db = await getDb();
  return db.select<MonthlyCountPoint[]>(
    `SELECT strftime('%Y-%m', deactivated_at) AS month, COUNT(*) AS count
     FROM clients
     WHERE gym_id = $1 AND deactivated_at IS NOT NULL
       AND date(deactivated_at) BETWEEN $2 AND $3
     GROUP BY month
     ORDER BY month`,
    [gymId, startDate, endDate],
  );
}

export interface LowAttendanceClientRow {
  id: string;
  name: string;
  days_without_attendance: number;
}

/**
 * Clientes activos que llevan `thresholdDays` o más sin asistir. Si nunca
 * han asistido, se usa join_date como referencia (nunca se marca a alguien
 * recién inscrito solo porque todavía no ha ido).
 */
export async function getClientsWithLowAttendance(
  gymId: string,
  thresholdDays: number,
): Promise<LowAttendanceClientRow[]> {
  const db = await getDb();
  return db.select<LowAttendanceClientRow[]>(
    `SELECT c.id, c.name,
       CAST(julianday(date('now')) - julianday(COALESCE(
         (SELECT MAX(a.date) FROM attendance a WHERE a.client_id = c.id AND a.gym_id = c.gym_id),
         c.join_date
       )) AS INTEGER) AS days_without_attendance
     FROM clients c
     WHERE c.gym_id = $1 AND c.status = 'ACTIVE' AND c.join_date IS NOT NULL
       AND COALESCE(
         (SELECT MAX(a.date) FROM attendance a WHERE a.client_id = c.id AND a.gym_id = c.gym_id),
         c.join_date
       ) <= date('now', '-' || $2 || ' days')
     ORDER BY days_without_attendance DESC`,
    [gymId, thresholdDays],
  );
}

export async function setClientAttendanceCode(
  gymId: string,
  id: string,
  attendanceCode: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET attendance_code = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [attendanceCode, id, gymId],
  );
}

export interface ClientFaceProfileInput {
  embedding: string | null;
  consent: boolean;
  enrolledAt: string | null;
}

/**
 * Update angosto para el reconocimiento facial, igual que
 * setClientAttendanceCode: nunca pasa por el UPDATE completo de
 * updateClient/ClientFormInput porque el rostro no se edita desde ese
 * formulario, sino desde su propia tarjeta en el perfil del cliente.
 */
export async function setClientFaceProfile(
  gymId: string,
  id: string,
  input: ClientFaceProfileInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET face_embedding = $1, face_consent = $2, face_enrolled_at = $3,
       updated_at = datetime('now')
     WHERE id = $4 AND gym_id = $5`,
    [input.embedding, input.consent ? 1 : 0, input.enrolledAt, id, gymId],
  );
}

export interface ClientFaceRow {
  id: string;
  name: string;
  photo_path: string | null;
  face_embedding: string;
}

/**
 * Solo clientes activos con un rostro ya enrolado, para que el kiosco
 * cargue una sola vez el set completo y compare en memoria (no hay forma
 * de comparar embeddings con SQL). Un cliente inactivo no debe poder
 * marcar entrada por rostro, igual que ya ocurre hoy con su PIN.
 */
export async function listClientsWithFaceEmbeddings(gymId: string): Promise<ClientFaceRow[]> {
  const db = await getDb();
  return db.select<ClientFaceRow[]>(
    `SELECT id, name, photo_path, face_embedding FROM clients
     WHERE gym_id = $1 AND status = 'ACTIVE' AND face_embedding IS NOT NULL`,
    [gymId],
  );
}

/**
 * Vincula (o desvincula) la cuenta de Firebase Auth de un cliente. El uid
 * lo entrega Identity Toolkit al crear el acceso a la app; ver
 * src/lib/cloud/clientAccountService.ts. Este UPDATE dispara el trigger de
 * outbox de `clients`, así que el cambio se sincroniza solo.
 */
export async function setClientCloudUid(
  gymId: string,
  id: string,
  cloudUid: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET cloud_uid = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [cloudUid, id, gymId],
  );
}
