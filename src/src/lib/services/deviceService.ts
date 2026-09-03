import * as deviceRepository from "../repositories/deviceRepository";
import * as gymRepository from "../repositories/gymRepository";
import { generatePairingCode, PAIRING_CODE_TTL_MINUTES } from "../domain/pairingCode";
import { generateDeviceToken } from "../domain/deviceToken";
import { evaluatePairingAttempt } from "../domain/devicePairing";
import type { DeviceListItem, PairingCodeResult } from "@/types/device";
import type { DeviceRow, DeviceStatus, DeviceType } from "@/types/db";

export class DeviceNotFoundError extends Error {
  constructor() {
    super("El dispositivo no existe en este gimnasio.");
  }
}

export class PairingRejectedError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

const PAIRING_CODE_MAX_ATTEMPTS = 10;

function mapRowToListItem(row: DeviceRow): DeviceListItem {
  return {
    id: row.id,
    name: row.name,
    deviceType: row.device_type,
    status: row.status,
    platform: row.platform,
    appVersion: row.app_version,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    lastSyncAt: row.last_sync_at,
  };
}

export async function getDevices(gymId: string): Promise<DeviceListItem[]> {
  const rows = await deviceRepository.listDevices(gymId);
  return rows.map(mapRowToListItem);
}

/**
 * Crea el dispositivo (PENDING) y su código de vinculación en un solo paso,
 * tal como lo pide el mockup: "Tipo + Nombre" -> "Generar código".
 */
export async function generateDeviceAndCode(
  gymId: string,
  name: string,
  deviceType: DeviceType,
): Promise<PairingCodeResult> {
  const deviceId = crypto.randomUUID();
  await deviceRepository.createPendingDevice(gymId, deviceId, name, deviceType);

  for (let attempt = 0; attempt < PAIRING_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = generatePairingCode();
    const existing = await deviceRepository.findPairingCodeByCode(code);
    if (!existing) {
      const codeId = crypto.randomUUID();
      const expiresAt = await deviceRepository.createPairingCode(
        codeId,
        deviceId,
        gymId,
        code,
        PAIRING_CODE_TTL_MINUTES,
      );
      return { deviceId, code, expiresAt };
    }
  }
  throw new Error("No se pudo generar un código de vinculación único. Intenta de nuevo.");
}

export async function cancelPairingCode(gymId: string, deviceId: string): Promise<void> {
  const code = await deviceRepository.findActivePairingCodeForDevice(gymId, deviceId);
  if (code) {
    await deviceRepository.cancelPairingCode(gymId, code.id);
  }
}

export interface ConsumePairingCodeResult {
  gymId: string;
  gymName: string;
  deviceId: string;
  deviceName: string;
  apiToken: string;
}

/**
 * Punto de entrada real de la vinculación: la tablet solo conoce el código,
 * nunca el gym_id de antemano. El gimnasio y el dispositivo se resuelven
 * ambos a partir del código, y evaluatePairingAttempt (dominio puro)
 * decide si se aprueba, igual que evaluateAccess decide el PIN de cliente.
 */
export async function consumePairingCode(
  code: string,
  platform: string | null,
  appVersion: string | null,
): Promise<ConsumePairingCodeResult> {
  const pairingCode = await deviceRepository.findPairingCodeByCode(code);
  const device = pairingCode ? await deviceRepository.findDeviceById(pairingCode.gym_id, pairingCode.device_id) : null;

  const decision = evaluatePairingAttempt({
    codeFound: pairingCode !== null,
    codeStatus: pairingCode?.status,
    expiresAt: pairingCode?.expires_at,
    deviceStatus: device?.status,
  });

  if (decision.kind !== "APPROVED") {
    const messages: Record<string, string> = {
      DENIED_CODE_NOT_FOUND: "Código de vinculación no válido.",
      DENIED_EXPIRED: "Este código de vinculación expiró. Genera uno nuevo desde el panel.",
      DENIED_ALREADY_USED: "Este código ya fue utilizado.",
      DENIED_CANCELLED: "Este código fue cancelado desde el panel.",
      DENIED_DEVICE_NOT_PENDING: "Este dispositivo ya no está pendiente de vinculación.",
    };
    throw new PairingRejectedError(messages[decision.kind]);
  }

  const apiToken = generateDeviceToken();
  await deviceRepository.activateDevice(
    pairingCode!.gym_id,
    device!.id,
    apiToken,
    platform,
    appVersion,
  );
  await deviceRepository.markPairingCodeUsed(pairingCode!.id);

  const gym = await gymRepository.findGymById(pairingCode!.gym_id);

  return {
    gymId: pairingCode!.gym_id,
    gymName: gym?.name ?? "",
    deviceId: device!.id,
    deviceName: device!.name,
    apiToken,
  };
}

export async function revokeDevice(gymId: string, deviceId: string): Promise<void> {
  await deviceRepository.setDeviceStatus(gymId, deviceId, "REVOKED" satisfies DeviceStatus);
}

/**
 * Autentica cada petición del servidor LAN por su token propio. Un
 * dispositivo revocado/deshabilitado nunca pasa, aunque el token sea
 * correcto: nunca confiar solamente en la posesión del token.
 */
export async function authenticateDeviceToken(token: string): Promise<DeviceRow | null> {
  const device = await deviceRepository.findDeviceByToken(token);
  if (!device || device.status !== "ACTIVE") return null;
  await deviceRepository.touchDeviceSeen(device.id);
  return device;
}
