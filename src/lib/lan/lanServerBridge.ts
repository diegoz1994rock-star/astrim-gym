import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import * as gymRepository from "../repositories/gymRepository";
import * as deviceService from "../services/deviceService";
import { PairingRejectedError } from "../services/deviceService";
import { registerAccessEvent } from "../services/accessService";

interface LanRequestEvent {
  requestId: string;
  path: string;
  body: string;
  authorization: string | null;
}

async function respond(requestId: string, status: number, body: unknown): Promise<void> {
  await invoke("respond_lan_request", { requestId, status, body: JSON.stringify(body) });
}

function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer (.+)$/.exec(authorization.trim());
  return match ? match[1] : null;
}

async function handlePair(requestId: string, body: string): Promise<void> {
  try {
    const { code, platform, appVersion } = JSON.parse(body) as {
      code?: string;
      platform?: string;
      appVersion?: string;
    };
    if (!code) {
      await respond(requestId, 400, { error: "Falta el código de vinculación." });
      return;
    }
    const result = await deviceService.consumePairingCode(code, platform ?? null, appVersion ?? null);
    await respond(requestId, 200, {
      gymId: result.gymId,
      gymName: result.gymName,
      deviceId: result.deviceId,
      deviceName: result.deviceName,
      apiToken: result.apiToken,
    });
  } catch (err) {
    const message = err instanceof PairingRejectedError ? err.reason : "No se pudo vincular el dispositivo.";
    await respond(requestId, 403, { error: message });
  }
}

async function handleAccess(requestId: string, body: string, authorization: string | null): Promise<void> {
  const token = bearerToken(authorization);
  if (!token) {
    await respond(requestId, 401, { error: "Falta el token del dispositivo." });
    return;
  }
  const device = await deviceService.authenticateDeviceToken(token);
  if (!device) {
    await respond(requestId, 401, { error: "Dispositivo no autorizado. Vincúlalo nuevamente." });
    return;
  }
  try {
    const { code } = JSON.parse(body) as { code?: string };
    if (!code) {
      await respond(requestId, 400, { error: "Falta el código de asistencia." });
      return;
    }
    const outcome = await registerAccessEvent(device.gym_id, code, device.id);
    await respond(requestId, 200, outcome);
  } catch {
    await respond(requestId, 500, { error: "No se pudo procesar el código." });
  }
}

/**
 * Único puente entre el servidor LAN (Rust) y la lógica real de la app.
 * Nunca reimplementa evaluateAccess/accessService/deviceService: solo
 * traduce peticiones HTTP a las mismas llamadas que ya usa /kiosko y el
 * panel de Configuración → Dispositivos.
 */
export async function startLanServerBridge(): Promise<() => void> {
  const unlisten = await listen<LanRequestEvent>("lan-request", (event) => {
    const { requestId, path, body, authorization } = event.payload;
    if (path === "/pair") {
      void handlePair(requestId, body);
    } else if (path === "/access") {
      void handleAccess(requestId, body, authorization);
    } else {
      void respond(requestId, 404, { error: "Ruta no encontrada." });
    }
  });
  // Confirma temprano que hay un gimnasio local resoluble; si no lo hay,
  // el bridge sigue activo pero /pair y /access fallarán con un error claro
  // en vez de silenciosamente no responder.
  await gymRepository.getSoleGymId();
  return unlisten;
}
