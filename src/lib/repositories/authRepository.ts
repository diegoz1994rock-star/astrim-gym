import bcrypt from "bcryptjs";
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

/** Guarda un nuevo hash de contraseña (bcrypt) para el usuario local. */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE users SET password_hash = $1, updated_at = datetime('now') WHERE id = $2",
    [bcrypt.hashSync(newPassword, 10), userId],
  );
}

/**
 * Crea (o actualiza) el usuario ADMIN local de un dueño que inició sesión
 * por primera vez contra Firebase. Se guarda el hash de la contraseña para
 * que los próximos logins funcionen sin conexión. Devuelve el id del user.
 */
export async function upsertCloudAdminUser(
  gymId: string,
  email: string,
  password: string,
): Promise<string> {
  const db = await getDb();
  const passwordHash = bcrypt.hashSync(password, 10);
  const name = email.split("@")[0] || email;

  const existing = await findUserByEmail(email);
  if (existing) {
    await db.execute(
      `UPDATE users SET gym_id = $1, password_hash = $2, role = 'ADMIN',
         status = 'ACTIVE', updated_at = datetime('now') WHERE id = $3`,
      [gymId, passwordHash, existing.id],
    );
    return existing.id;
  }

  const id = `user_${crypto.randomUUID()}`;
  await db.execute(
    `INSERT INTO users (id, gym_id, name, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, $5, 'ADMIN', 'ACTIVE')`,
    [id, gymId, name, email, passwordHash],
  );
  return id;
}
