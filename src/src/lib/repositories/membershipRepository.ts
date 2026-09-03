import { getDb } from "../db/client";
import type { MembershipListRow, PaymentStatus } from "@/types/db";

export interface PlanSalesRow {
  plan_id: string;
  plan_name: string;
  sales: number;
}

/** "Planes más vendidos": cada fila de memberships creada en el rango es
 * una venta real (así se crea siempre una membresía en este sistema). No
 * es lo mismo que membership_plans.client_count (que solo cuenta la
 * membresía MÁS RECIENTE de cada cliente, es decir "quién tiene el plan
 * hoy"), por eso es una consulta nueva y no una reutilización directa. */
/** Una "renovación" real = una membresía que no es la primera que ese
 * cliente ha tenido nunca (si fuera la primera, sería una venta a cliente
 * nuevo, no una renovación). */
export async function getRenewalsCount(gymId: string, startDate: string, endDate: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) AS count
     FROM memberships m
     WHERE m.gym_id = $1 AND m.start_date BETWEEN $2 AND $3
       AND EXISTS (
         SELECT 1 FROM memberships m2
         WHERE m2.client_id = m.client_id AND m2.gym_id = m.gym_id AND m2.start_date < m.start_date
       )`,
    [gymId, startDate, endDate],
  );
  return rows[0]?.count ?? 0;
}

export async function getPlanSalesCount(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<PlanSalesRow[]> {
  const db = await getDb();
  return db.select<PlanSalesRow[]>(
    `SELECT p.id AS plan_id, p.name AS plan_name, COUNT(*) AS sales
     FROM memberships m
     JOIN membership_plans p ON p.id = m.plan_id
     WHERE m.gym_id = $1 AND m.start_date BETWEEN $2 AND $3
     GROUP BY p.id, p.name
     ORDER BY sales DESC`,
    [gymId, startDate, endDate],
  );
}

const MEMBERSHIP_SELECT = `
  SELECT
    m.id, m.gym_id, m.client_id, c.name AS client_name, c.document AS client_document,
    m.plan_id, p.name AS plan_name, m.start_date, m.end_date, m.price,
    m.payment_status, m.method, m.manual_status, m.notes
  FROM memberships m
  JOIN clients c ON c.id = m.client_id
  JOIN membership_plans p ON p.id = m.plan_id
`;

export async function listMemberships(gymId: string): Promise<MembershipListRow[]> {
  const db = await getDb();
  return db.select<MembershipListRow[]>(
    `${MEMBERSHIP_SELECT} WHERE m.gym_id = $1 ORDER BY m.start_date DESC`,
    [gymId],
  );
}

export async function listMembershipsByClient(
  gymId: string,
  clientId: string,
): Promise<MembershipListRow[]> {
  const db = await getDb();
  return db.select<MembershipListRow[]>(
    `${MEMBERSHIP_SELECT} WHERE m.gym_id = $1 AND m.client_id = $2 ORDER BY m.start_date DESC`,
    [gymId, clientId],
  );
}

export async function findMembershipById(
  gymId: string,
  id: string,
): Promise<MembershipListRow | null> {
  const db = await getDb();
  const rows = await db.select<MembershipListRow[]>(
    `${MEMBERSHIP_SELECT} WHERE m.gym_id = $1 AND m.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

export interface CreateMembershipInput {
  clientId: string;
  planId: string;
  startDate: string;
  endDate: string;
  price: number;
  paymentStatus: PaymentStatus;
  method: string | null;
  notes: string | null;
}

export async function createMembership(
  gymId: string,
  id: string,
  input: CreateMembershipInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO memberships (
       id, gym_id, client_id, plan_id, start_date, end_date, price,
       payment_status, method, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id,
      gymId,
      input.clientId,
      input.planId,
      input.startDate,
      input.endDate,
      input.price,
      input.paymentStatus,
      input.method,
      input.notes,
    ],
  );
}

export interface UpdateMembershipInput {
  startDate: string;
  endDate: string;
  price: number;
  paymentStatus: PaymentStatus;
  method: string | null;
  notes: string | null;
  manualStatus: "SUSPENDED" | "CANCELLED" | null;
}

export async function updateMembership(
  gymId: string,
  id: string,
  input: UpdateMembershipInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE memberships SET
       start_date = $1, end_date = $2, price = $3, payment_status = $4,
       method = $5, notes = $6, manual_status = $7, updated_at = datetime('now')
     WHERE id = $8 AND gym_id = $9`,
    [
      input.startDate,
      input.endDate,
      input.price,
      input.paymentStatus,
      input.method,
      input.notes,
      input.manualStatus,
      id,
      gymId,
    ],
  );
}
