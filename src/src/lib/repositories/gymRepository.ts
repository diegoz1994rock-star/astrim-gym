import { getDb } from "../db/client";
import type { GymRecord, GymSettingsRow } from "@/types/db";
import type { GymSettingsFormInput } from "@/types/gym";

export async function findGymById(id: string): Promise<GymRecord | null> {
  const db = await getDb();
  const rows = await db.select<GymRecord[]>(
    "SELECT * FROM gyms WHERE id = $1 LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Cada instalación local de ASTRIM GYM administra un único gimnasio. El
 * kiosco de recepción se apoya en esto para resolver su gym_id sin exigir
 * una sesión de administrador iniciada: no hay riesgo multi-tenant porque
 * solo existe una fila en gyms por instalación.
 */
export async function getSoleGymId(): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>("SELECT id FROM gyms LIMIT 1");
  return rows[0]?.id ?? null;
}

export async function getAttendanceDuplicateWindowSeconds(gymId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ attendance_duplicate_window_seconds: number }[]>(
    "SELECT attendance_duplicate_window_seconds FROM gyms WHERE id = $1 LIMIT 1",
    [gymId],
  );
  return rows[0]?.attendance_duplicate_window_seconds ?? 30;
}

export async function findGymSettingsById(gymId: string): Promise<GymSettingsRow | null> {
  const db = await getDb();
  const rows = await db.select<GymSettingsRow[]>(
    "SELECT id, name, phone, email, address, city, logo_path FROM gyms WHERE id = $1 LIMIT 1",
    [gymId],
  );
  return rows[0] ?? null;
}

/**
 * Único id aceptado: el gym_id del administrador autenticado. No existe
 * ningún parámetro adicional de "gimnasio destino": es imposible construir
 * una llamada que actualice un gimnasio distinto al de la sesión actual.
 */
export async function updateGymSettings(
  gymId: string,
  input: GymSettingsFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE gyms SET
       name = $1, phone = $2, email = $3, address = $4, city = $5, logo_path = $6,
       updated_at = datetime('now')
     WHERE id = $7`,
    [
      input.name.trim(),
      input.phone.trim() || null,
      input.email.trim() || null,
      input.address.trim() || null,
      input.city.trim() || null,
      input.logoPath,
      gymId,
    ],
  );
}
