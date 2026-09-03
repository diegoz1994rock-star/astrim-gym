import { getDb } from "../db/client";
import type { MembershipPlanRow } from "@/types/db";
import type { MembershipPlanFormInput } from "@/types/membership";

const PLAN_SELECT = `
  SELECT
    p.id, p.gym_id, p.name, p.duration_days, p.price, p.description, p.active,
    (
      SELECT COUNT(*) FROM clients c
      WHERE c.gym_id = p.gym_id
        AND (
          SELECT m.plan_id FROM memberships m
          WHERE m.client_id = c.id AND m.gym_id = c.gym_id
          ORDER BY m.end_date DESC
          LIMIT 1
        ) = p.id
    ) AS client_count
  FROM membership_plans p
`;

export async function listPlans(gymId: string): Promise<MembershipPlanRow[]> {
  const db = await getDb();
  return db.select<MembershipPlanRow[]>(
    `${PLAN_SELECT} WHERE p.gym_id = $1 ORDER BY p.name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function listActivePlans(gymId: string): Promise<MembershipPlanRow[]> {
  const db = await getDb();
  return db.select<MembershipPlanRow[]>(
    `${PLAN_SELECT} WHERE p.gym_id = $1 AND p.active = 1 ORDER BY p.name COLLATE NOCASE ASC`,
    [gymId],
  );
}

export async function findPlanById(gymId: string, id: string): Promise<MembershipPlanRow | null> {
  const db = await getDb();
  const rows = await db.select<MembershipPlanRow[]>(
    `${PLAN_SELECT} WHERE p.gym_id = $1 AND p.id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

export async function findPlanByName(
  gymId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM membership_plans WHERE gym_id = $1 AND name = $2 COLLATE NOCASE AND id != $3 LIMIT 1`,
    [gymId, name, excludeId ?? ""],
  );
  return rows[0] ?? null;
}

export async function createPlan(
  gymId: string,
  id: string,
  input: MembershipPlanFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO membership_plans (id, gym_id, name, duration_days, price, description, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      gymId,
      input.name.trim(),
      input.durationDays,
      input.price,
      input.description.trim() || null,
      input.active ? 1 : 0,
    ],
  );
}

export async function updatePlan(
  gymId: string,
  id: string,
  input: MembershipPlanFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE membership_plans SET
       name = $1, duration_days = $2, price = $3, description = $4, active = $5,
       updated_at = datetime('now')
     WHERE id = $6 AND gym_id = $7`,
    [
      input.name.trim(),
      input.durationDays,
      input.price,
      input.description.trim() || null,
      input.active ? 1 : 0,
      id,
      gymId,
    ],
  );
}

export async function setPlanActive(gymId: string, id: string, active: boolean): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE membership_plans SET active = $1, updated_at = datetime('now') WHERE id = $2 AND gym_id = $3`,
    [active ? 1 : 0, id, gymId],
  );
}
