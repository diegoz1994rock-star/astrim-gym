import { getDb } from "../db/client";
import { getMonthlyRevenue, getRevenueSeries } from "./paymentRepository";
import type { AttendanceCountsRow, ClientStatsRow, MembershipRow } from "@/types/db";

export { getMonthlyRevenue, getRevenueSeries };

export async function getClientStats(gymId: string): Promise<ClientStatsRow> {
  const db = await getDb();
  const rows = await db.select<ClientStatsRow[]>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active
     FROM clients WHERE gym_id = $1`,
    [gymId],
  );
  return rows[0] ?? { total: 0, active: 0 };
}

export async function getLatestMembershipsPerClient(gymId: string): Promise<MembershipRow[]> {
  const db = await getDb();
  return db.select<MembershipRow[]>(
    `SELECT m.id, m.client_id, m.end_date, m.manual_status, m.price
     FROM memberships m
     JOIN (
       SELECT client_id, MAX(end_date) AS max_end_date
       FROM memberships
       WHERE gym_id = $1
       GROUP BY client_id
     ) latest ON latest.client_id = m.client_id AND latest.max_end_date = m.end_date
     WHERE m.gym_id = $1`,
    [gymId],
  );
}

export async function getTrainerCount(gymId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM trainers WHERE gym_id = $1 AND status = 'ACTIVE'",
    [gymId],
  );
  return rows[0]?.count ?? 0;
}

export async function getAttendanceCounts(gymId: string): Promise<AttendanceCountsRow> {
  const db = await getDb();
  const rows = await db.select<AttendanceCountsRow[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN date = date('now') THEN 1 ELSE 0 END), 0) AS today,
       COALESCE(SUM(CASE WHEN date >= date('now', '-6 days') THEN 1 ELSE 0 END), 0) AS week
     FROM attendance WHERE gym_id = $1`,
    [gymId],
  );
  return rows[0] ?? { today: 0, week: 0 };
}
