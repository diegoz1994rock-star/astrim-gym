import { getDb } from "../db/client";
import type { DevicePairingCodeRow, DeviceRow, DeviceStatus, DeviceType } from "@/types/db";

export async function listDevices(gymId: string): Promise<DeviceRow[]> {
  const db = await getDb();
  return db.select<DeviceRow[]>(
    `SELECT * FROM devices WHERE gym_id = $1 ORDER BY created_at DESC`,
    [gymId],
  );
}

export async function findDeviceById(gymId: string, id: string): Promise<DeviceRow | null> {
  const db = await getDb();
  const rows = await db.select<DeviceRow[]>(
    `SELECT * FROM devices WHERE gym_id = $1 AND id = $2 LIMIT 1`,
    [gymId, id],
  );
  return rows[0] ?? null;
}

/**
 * Autentica una petición del servidor LAN: busca el dispositivo por su
 * token propio, nunca por nombre ni por gym_id del payload (el gym_id
 * viene siempre del dispositivo encontrado, nunca del request).
 */
export async function findDeviceByToken(token: string): Promise<DeviceRow | null> {
  const db = await getDb();
  const rows = await db.select<DeviceRow[]>(
    `SELECT * FROM devices WHERE api_token = $1 LIMIT 1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function createPendingDevice(
  gymId: string,
  id: string,
  name: string,
  deviceType: DeviceType,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO devices (id, gym_id, name, device_type, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
    [id, gymId, name.trim(), deviceType],
  );
}

export async function activateDevice(
  gymId: string,
  deviceId: string,
  apiToken: string,
  platform: string | null,
  appVersion: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE devices SET status = 'ACTIVE', api_token = $1, platform = $2, app_version = $3,
       last_seen_at = datetime('now')
     WHERE id = $4 AND gym_id = $5`,
    [apiToken, platform, appVersion, deviceId, gymId],
  );
}

export async function setDeviceStatus(
  gymId: string,
  deviceId: string,
  status: DeviceStatus,
): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE devices SET status = $1 WHERE id = $2 AND gym_id = $3`, [
    status,
    deviceId,
    gymId,
  ]);
}

export async function touchDeviceSeen(deviceId: string): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE devices SET last_seen_at = datetime('now') WHERE id = $1`, [deviceId]);
}

export async function touchDeviceSynced(deviceId: string): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE devices SET last_sync_at = datetime('now') WHERE id = $1`, [deviceId]);
}

export async function createPairingCode(
  id: string,
  deviceId: string,
  gymId: string,
  code: string,
  ttlMinutes: number,
): Promise<string> {
  const db = await getDb();
  const rows = await db.select<{ expires_at: string }[]>(
    `SELECT datetime('now', '+' || $1 || ' minutes') AS expires_at`,
    [ttlMinutes],
  );
  const expiresAt = rows[0].expires_at;
  await db.execute(
    `INSERT INTO device_pairing_codes (id, device_id, gym_id, code, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [id, deviceId, gymId, code, expiresAt],
  );
  return expiresAt;
}

/**
 * Búsqueda del código sin acotar a un gimnasio: la tablet que se vincula
 * todavía no pertenece a ningún gym_id conocido por el llamador (por eso
 * el gimnasio del dispositivo lo determina este código, no al revés).
 */
export async function findPairingCodeByCode(code: string): Promise<DevicePairingCodeRow | null> {
  const db = await getDb();
  const rows = await db.select<DevicePairingCodeRow[]>(
    `SELECT * FROM device_pairing_codes WHERE code = $1 AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1`,
    [code],
  );
  return rows[0] ?? null;
}

export async function markPairingCodeUsed(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE device_pairing_codes SET status = 'USED', used_at = datetime('now') WHERE id = $1`,
    [id],
  );
}

export async function cancelPairingCode(gymId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE device_pairing_codes SET status = 'CANCELLED' WHERE id = $1 AND gym_id = $2 AND status = 'PENDING'`,
    [id, gymId],
  );
}

export async function findActivePairingCodeForDevice(
  gymId: string,
  deviceId: string,
): Promise<DevicePairingCodeRow | null> {
  const db = await getDb();
  const rows = await db.select<DevicePairingCodeRow[]>(
    `SELECT * FROM device_pairing_codes
     WHERE gym_id = $1 AND device_id = $2 AND status = 'PENDING'
     ORDER BY created_at DESC LIMIT 1`,
    [gymId, deviceId],
  );
  return rows[0] ?? null;
}
