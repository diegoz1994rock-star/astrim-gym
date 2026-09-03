import { getDb } from "../db/client";
import type { PaymentMethod, PaymentRow, PaymentStatus, RevenuePoint } from "@/types/db";

const PAYMENT_SELECT = `
  SELECT
    pay.id, pay.gym_id, pay.client_id, c.name AS client_name, c.document AS client_document,
    pay.membership_id, p.name AS plan_name, pay.amount, pay.date, pay.method, pay.status, pay.concept
  FROM payments pay
  JOIN clients c ON c.id = pay.client_id
  LEFT JOIN memberships m ON m.id = pay.membership_id
  LEFT JOIN membership_plans p ON p.id = m.plan_id
`;

export interface CreatePaymentInput {
  clientId: string;
  membershipId: string | null;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  concept: string | null;
}

export async function createPayment(
  gymId: string,
  id: string,
  input: CreatePaymentInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO payments (id, gym_id, client_id, membership_id, amount, date, method, status, concept)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      gymId,
      input.clientId,
      input.membershipId,
      input.amount,
      input.date,
      input.method,
      input.status,
      input.concept,
    ],
  );
}

export async function listPayments(gymId: string): Promise<PaymentRow[]> {
  const db = await getDb();
  return db.select<PaymentRow[]>(
    `${PAYMENT_SELECT} WHERE pay.gym_id = $1 ORDER BY pay.date DESC, pay.created_at DESC`,
    [gymId],
  );
}

export async function findPaymentById(gymId: string, id: string): Promise<PaymentRow | null> {
  const db = await getDb();
  const rows = await db.select<PaymentRow[]>(
    `${PAYMENT_SELECT} WHERE pay.gym_id = $1 AND pay.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

export interface UpdatePaymentConceptInput {
  method: PaymentMethod;
  concept: string | null;
}

/**
 * Edición deliberadamente limitada a método y concepto: nunca se permite
 * modificar monto, fecha, cliente o membresía de un pago ya registrado,
 * para no falsificar el historial financiero.
 */
export async function updatePaymentConcept(
  gymId: string,
  id: string,
  input: UpdatePaymentConceptInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE payments SET method = $1, concept = $2, updated_at = datetime('now')
     WHERE id = $3 AND gym_id = $4`,
    [input.method, input.concept, id, gymId],
  );
}

export async function getMonthlyRevenue(gymId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ total: number }[]>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
     WHERE gym_id = $1 AND status = 'PAID' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`,
    [gymId],
  );
  return rows[0]?.total ?? 0;
}

export async function getRevenueSeries(gymId: string, months: number): Promise<RevenuePoint[]> {
  const db = await getDb();
  return db.select<RevenuePoint[]>(
    `SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
     FROM payments
     WHERE gym_id = $1 AND status = 'PAID'
       AND date >= date('now', 'start of month', $2)
     GROUP BY month
     ORDER BY month`,
    [gymId, `-${months - 1} months`],
  );
}

/** Serie mensual de ingresos reales dentro de un rango de fechas explícito
 * (a diferencia de getRevenueSeries, que siempre termina en el mes actual).
 * Los meses sin pagos simplemente no aparecen; fillYearMonths() se encarga
 * de completarlos con $0 en la capa de dominio, no aquí. */
export async function getRevenueSeriesForRange(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<RevenuePoint[]> {
  const db = await getDb();
  return db.select<RevenuePoint[]>(
    `SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
     FROM payments
     WHERE gym_id = $1 AND status = 'PAID' AND date BETWEEN $2 AND $3
     GROUP BY month
     ORDER BY month`,
    [gymId, startDate, endDate],
  );
}

export async function getRevenueForPeriod(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ total: number }[]>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
     WHERE gym_id = $1 AND status = 'PAID' AND date BETWEEN $2 AND $3`,
    [gymId, startDate, endDate],
  );
  return rows[0]?.total ?? 0;
}

export async function getPaymentsCount(gymId: string, startDate: string, endDate: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM payments WHERE gym_id = $1 AND status = 'PAID' AND date BETWEEN $2 AND $3`,
    [gymId, startDate, endDate],
  );
  return rows[0]?.count ?? 0;
}

export interface PendingPaymentsSummary {
  count: number;
  total: number;
}

export async function getPendingPaymentsSummary(gymId: string): Promise<PendingPaymentsSummary> {
  const db = await getDb();
  const rows = await db.select<PendingPaymentsSummary[]>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM payments WHERE gym_id = $1 AND status = 'PENDING'`,
    [gymId],
  );
  return rows[0] ?? { count: 0, total: 0 };
}

/** Años reales con al menos un pago PAID — así el selector de año del
 * Dashboard solo ofrece años que de verdad tienen datos, nunca un rango
 * arbitrario inventado. */
export async function getAvailableRevenueYears(gymId: string): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select<{ year: string }[]>(
    `SELECT DISTINCT strftime('%Y', date) AS year FROM payments
     WHERE gym_id = $1 AND status = 'PAID' ORDER BY year DESC`,
    [gymId],
  );
  return rows.map((row) => Number(row.year));
}

export interface PlanRevenueRow {
  plan_id: string;
  plan_name: string;
  total: number;
}

/** Ingresos reales por plan: pagos PAID vinculados (vía membership_id) al
 * plan correspondiente, en el rango dado. Un pago sin membresía asociada
 * (membership_id NULL) no pertenece a ningún plan y queda fuera, tal como
 * ya lo trata el resto del sistema. */
export async function getRevenueByPlan(
  gymId: string,
  startDate: string,
  endDate: string,
): Promise<PlanRevenueRow[]> {
  const db = await getDb();
  return db.select<PlanRevenueRow[]>(
    `SELECT p.id AS plan_id, p.name AS plan_name, SUM(pay.amount) AS total
     FROM payments pay
     JOIN memberships m ON m.id = pay.membership_id
     JOIN membership_plans p ON p.id = m.plan_id
     WHERE pay.gym_id = $1 AND pay.status = 'PAID' AND pay.date BETWEEN $2 AND $3
     GROUP BY p.id, p.name
     ORDER BY total DESC`,
    [gymId, startDate, endDate],
  );
}
