import { getDb } from "../db/client";
import type { AttendanceRow, AttendeeCountRow } from "@/types/db";

const ATTENDANCE_SELECT = `
  SELECT
    a.id, a.gym_id, a.client_id, c.name AS client_name, c.document AS client_document,
    a.date, a.check_in, a.check_out, a.status, a.membership_id, p.name AS plan_name, a.notes,
    a.entry_method, a.exit_method, a.device_id
  FROM attendance a
  JOIN clients c ON c.id = a.client_id
  LEFT JOIN memberships m ON m.id = a.membership_id
  LEFT JOIN membership_plans p ON p.id = m.plan_id
`;

export async function listAttendance(gymId: string): Promise<AttendanceRow[]> {
  const db = await getDb();
  return db.select<AttendanceRow[]>(
    `${ATTENDANCE_SELECT} WHERE a.gym_id = $1 ORDER BY a.date DESC, a.check_in DESC`,
    [gymId],
  );
}

export async function findAttendanceById(gymId: string, id: string): Promise<AttendanceRow | null> {
  const db = await getDb();
  const rows = await db.select<AttendanceRow[]>(
    `${ATTENDANCE_SELECT} WHERE a.gym_id = $1 AND a.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

/**
 * Regla de duplicados: un cliente no puede tener dos entradas abiertas el
 * mismo día (check_in sin check_out). Si ya salió, sí puede volver a
 * entrar el mismo día — eso no cuenta como duplicado.
 */
export async function findOpenAttendanceForClientToday(
  gymId: string,
  clientId: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM attendance
     WHERE gym_id = $1 AND client_id = $2 AND date = date('now') AND check_out IS NULL
     LIMIT 1`,
    [gymId, clientId],
  );
  return rows[0] ?? null;
}

/**
 * Igual que findOpenAttendanceForClientToday, pero además calcula cuántos
 * segundos han pasado desde el check_in usando el reloj de SQLite (nunca
 * el del frontend) — lo usa el flujo de PIN para decidir si una "salida"
 * inmediata es en realidad un doble toque accidental.
 */
export async function findOpenAttendanceWithElapsed(
  gymId: string,
  clientId: string,
): Promise<{ id: string; seconds_since_entry: number } | null> {
  const db = await getDb();
  const rows = await db.select<{ id: string; seconds_since_entry: number }[]>(
    `SELECT id, (strftime('%s', 'now') - strftime('%s', date || ' ' || check_in)) AS seconds_since_entry
     FROM attendance
     WHERE gym_id = $1 AND client_id = $2 AND date = date('now') AND check_out IS NULL
     LIMIT 1`,
    [gymId, clientId],
  );
  return rows[0] ?? null;
}

export interface CreateAttendanceInput {
  clientId: string;
  membershipId: string | null;
  notes: string | null;
  entryMethod: string | null;
  deviceId: string | null;
}

/** date/check_in siempre se generan con las funciones de fecha de SQLite, nunca con el reloj del frontend. */
export async function createAttendance(
  gymId: string,
  id: string,
  input: CreateAttendanceInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO attendance (id, gym_id, client_id, date, check_in, status, membership_id, notes, entry_method, device_id)
     VALUES ($1, $2, $3, date('now'), time('now'), 'PRESENT', $4, $5, $6, $7)`,
    [id, gymId, input.clientId, input.membershipId, input.notes, input.entryMethod, input.deviceId],
  );
}

/** Solo cierra una asistencia abierta (check_out IS NULL) y del gimnasio actual. */
export async function checkOutAttendance(
  gymId: string,
  id: string,
  exitMethod: string | null = null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE attendance SET check_out = time('now'), exit_method = $3
     WHERE id = $1 AND gym_id = $2 AND check_out IS NULL`,
    [id, gymId, exitMethod],
  );
}

export interface AttendanceStatsRow {
  today: number;
  inside_now: number;
  this_month: number;
}

export async function getStats(gymId: string): Promise<AttendanceStatsRow> {
  const db = await getDb();
  const rows = await db.select<AttendanceStatsRow[]>(
    `SELECT
       SUM(CASE WHEN date = date('now') THEN 1 ELSE 0 END) AS today,
       SUM(CASE WHEN date = date('now') AND check_in IS NOT NULL AND check_out IS NULL THEN 1 ELSE 0 END) AS inside_now,
       SUM(CASE WHEN strftime('%Y-%m', date) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) AS this_month
     FROM attendance WHERE gym_id = $1`,
    [gymId],
  );
  return rows[0] ?? { today: 0, inside_now: 0, this_month: 0 };
}

/** Ranking de asistencia real dentro de un rango de fechas explícito
 * (clientes más constantes). getTopAttendeesThisMonth queda como wrapper
 * de compatibilidad para no tocar su único uso actual. */
export async function getTopAttendees(
  gymId: string,
  startDate: string,
  endDate: string,
  limit: number,
): Promise<AttendeeCountRow[]> {
  const db = await getDb();
  return db.select<AttendeeCountRow[]>(
    `SELECT a.client_id, c.name AS client_name, COUNT(*) AS visits
     FROM attendance a
     JOIN clients c ON c.id = a.client_id
     WHERE a.gym_id = $1 AND a.date BETWEEN $2 AND $3
     GROUP BY a.client_id
     ORDER BY visits DESC, client_name COLLATE NOCASE ASC
     LIMIT $4`,
    [gymId, startDate, endDate, limit],
  );
}

export async function getTopAttendeesThisMonth(gymId: string, limit: number): Promise<AttendeeCountRow[]> {
  const db = await getDb();
  return db.select<AttendeeCountRow[]>(
    `SELECT a.client_id, c.name AS client_name, COUNT(*) AS visits
     FROM attendance a
     JOIN clients c ON c.id = a.client_id
     WHERE a.gym_id = $1 AND strftime('%Y-%m', a.date) = strftime('%Y-%m', 'now')
     GROUP BY a.client_id
     ORDER BY visits DESC, client_name COLLATE NOCASE ASC
     LIMIT $2`,
    [gymId, limit],
  );
}

export interface WeekdayAttendanceRow {
  day_label: string;
  day_order: number;
  count: number;
}

/** Asistencias reales agrupadas por día de la semana (lunes primero),
 * dentro del rango dado. Nunca filtra por entry_method/exit_method: cuenta
 * PIN, manual y cualquier método futuro (QR/APP/biometría) por igual. */
export async function getWeeklyAttendance(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<WeekdayAttendanceRow[]> {
  const db = await getDb();
  return db.select<WeekdayAttendanceRow[]>(
    `SELECT
       CASE strftime('%w', date)
         WHEN '0' THEN 'Domingo' WHEN '1' THEN 'Lunes' WHEN '2' THEN 'Martes'
         WHEN '3' THEN 'Miércoles' WHEN '4' THEN 'Jueves' WHEN '5' THEN 'Viernes'
         ELSE 'Sábado' END AS day_label,
       CASE strftime('%w', date) WHEN '0' THEN 7 ELSE CAST(strftime('%w', date) AS INTEGER) END AS day_order,
       COUNT(*) AS count
     FROM attendance
     WHERE gym_id = $1 AND date BETWEEN $2 AND $3
     GROUP BY day_label, day_order
     ORDER BY day_order`,
    [gymId, startDate, endDate],
  );
}

export interface PeakHourRow {
  hour: number;
  count: number;
}

/** Horas de mayor afluencia reales, calculadas a partir de check_in.
 * Solo devuelve horas con al menos un registro; no rellena 24 horas con
 * ceros (la UI decide el mensaje cuando hay pocos datos). */
export async function getPeakHours(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<PeakHourRow[]> {
  const db = await getDb();
  return db.select<PeakHourRow[]>(
    `SELECT CAST(strftime('%H', check_in) AS INTEGER) AS hour, COUNT(*) AS count
     FROM attendance
     WHERE gym_id = $1 AND check_in IS NOT NULL AND date BETWEEN $2 AND $3
     GROUP BY hour
     ORDER BY hour`,
    [gymId, startDate, endDate],
  );
}
