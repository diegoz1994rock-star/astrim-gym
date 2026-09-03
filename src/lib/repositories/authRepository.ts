import { getDb } from "../db/client";
import type { UserRecord } from "@/types/db";

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await getDb();
  const rows = await db.select<UserRecord[]>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email],
  );
  return rows[0] ?? null;
}

export async function touchLastLogin(userId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE users SET last_login_at = datetime('now') WHERE id = $1",
    [userId],
  );
}
