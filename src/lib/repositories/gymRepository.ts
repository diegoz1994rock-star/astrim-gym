import { getDb } from "../db/client";
import type { GymRecord, GymSettingsRow, LicenseStatus } from "@/types/db";
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
 * Bootstrap local de un gimnasio cuyo alta y licencia se administran en la
 * nube (consola de operador). Se llama en el primer login del dueño: crea
 * la fila `gyms` local para que el resto del panel — que lee `user.gymId`
 * en todas partes — funcione sin cambios. En logins posteriores refresca
 * nombre y licencia. La licencia real vive en Firestore; acá se cachea.
 */
export async function upsertGymFromCloud(
  gymId: string,
  name: string,
  licenseStatus: LicenseStatus,
  licenseExpiresAt: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO gyms (id, name, slug, license_status, license_expiration_date)
     VALUES ($1, $2, $1, $3, $4)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       license_status = excluded.license_status,
       license_expiration_date = excluded.license_expiration_date,
       updated_at = datetime('now')`,
    [gymId, name || gymId, licenseStatus, licenseExpiresAt],
  );
}

/** Cachea el estado de licencia traído de la nube (best-effort en cada login). */
export async function updateGymLicense(
  gymId: string,
  licenseStatus: LicenseStatus,
  licenseExpiresAt: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE gyms SET license_status = $1, license_expiration_date = $2,
       updated_at = datetime('now') WHERE id = $3`,
    [licenseStatus, licenseExpiresAt, gymId],
  );
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

export interface GymCloudBrandRow {
  brand_color: string | null;
  logo_base64: string | null;
  logo_path: string | null;
}

export async function findGymCloudBrand(gymId: string): Promise<GymCloudBrandRow | null> {
  const db = await getDb();
  const rows = await db.select<GymCloudBrandRow[]>(
    "SELECT brand_color, logo_base64, logo_path FROM gyms WHERE id = $1 LIMIT 1",
    [gymId],
  );
  return rows[0] ?? null;
}

/**
 * Marca de la app de clientes: color de acento + logo optimizado en base64.
 * Aparte de updateGymSettings a propósito — no toca el formulario de
 * Configuración existente. El UPDATE dispara el trigger de outbox de `gyms`.
 */
export async function updateGymCloudBrand(
  gymId: string,
  brandColor: string | null,
  logoBase64: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE gyms SET brand_color = $1, logo_base64 = $2, updated_at = datetime('now') WHERE id = $3`,
    [brandColor, logoBase64, gymId],
  );
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
