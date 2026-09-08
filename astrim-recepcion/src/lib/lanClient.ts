const LAN_PORT = 47822;
const REQUEST_TIMEOUT_MS = 6000;

export class LanRequestError extends Error {}

function baseUrl(host: string): string {
  return `http://${host}:${LAN_PORT}`;
}

/**
 * fetch() no tiene timeout propio: si la red queda inalcanzable (por
 * ejemplo, la tablet salió del WiFi del gimnasio y quedó en datos
 * móviles apuntando a una IP privada), la petición puede quedarse
 * colgada mucho más de lo razonable y bloquear la interfaz. Se corta a
 * los pocos segundos para caer siempre al camino de "sin conexión".
 */
function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Cliente HTTP puro hacia el servidor LAN del computador principal. Nunca
 * decide nada por su cuenta: siempre delega la validación real (código de
 * vinculación, PIN de asistencia) al mismo accessService/deviceService que
 * ya usa el panel administrativo y /kiosko.
 */
export async function pingServer(host: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${baseUrl(host)}/ping`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

export interface PairResponse {
  gymId: string;
  gymName: string;
  deviceId: string;
  deviceName: string;
  apiToken: string;
}

export async function pairWithServer(host: string, code: string): Promise<PairResponse> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${baseUrl(host)}/pair`, {
      method: "POST",
      body: JSON.stringify({ code, platform: "android", appVersion: "1.0.0" }),
    });
  } catch {
    throw new LanRequestError("No se pudo contactar al computador del gimnasio.");
  }
  const data = await response.json();
  if (!response.ok) {
    throw new LanRequestError(data.error ?? "No se pudo vincular el dispositivo.");
  }
  return data as PairResponse;
}

export type MembershipStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "SUSPENDED" | "CANCELLED";

export type AccessOutcome =
  | { kind: "ENTRY_ALLOWED"; clientName: string; photoBase64: string | null; time: string }
  | {
      kind: "EXIT_ALLOWED";
      clientName: string;
      photoBase64: string | null;
      time: string;
      durationMinutes: number | null;
    }
  | { kind: "DUPLICATE_IGNORED"; clientName: string; photoBase64: string | null }
  | { kind: "DENIED_CODE_NOT_FOUND" }
  | { kind: "DENIED_CLIENT_INACTIVE" }
  | { kind: "DENIED_MEMBERSHIP_INVALID"; membershipStatus: MembershipStatus | null }
  /** Solo la devuelve /access-face: nadie coincidió con el rostro. */
  | { kind: "FACE_NOT_RECOGNIZED" };

export type AccessRequestResult =
  | { status: "OK"; outcome: AccessOutcome }
  | { status: "UNAUTHORIZED" }
  | { status: "NETWORK_ERROR" };

export async function registerAccess(
  host: string,
  apiToken: string,
  code: string,
): Promise<AccessRequestResult> {
  try {
    const response = await fetchWithTimeout(`${baseUrl(host)}/access`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ code }),
    });
    if (response.status === 401) {
      return { status: "UNAUTHORIZED" };
    }
    const data = await response.json();
    return { status: "OK", outcome: data as AccessOutcome };
  } catch {
    return { status: "NETWORK_ERROR" };
  }
}

/**
 * Nunca envía la foto del rostro: solo el embedding (128 floats) ya
 * calculado en el propio dispositivo. La comparación siempre ocurre en el
 * servidor (esta app no tiene ni tendrá una copia local de los rostros
 * enrolados), por eso no hay equivalente offline de esta función.
 */
export async function registerAccessByFace(
  host: string,
  apiToken: string,
  embedding: number[],
): Promise<AccessRequestResult> {
  try {
    const response = await fetchWithTimeout(`${baseUrl(host)}/access-face`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ embedding }),
    });
    if (response.status === 401) {
      return { status: "UNAUTHORIZED" };
    }
    const data = await response.json();
    return { status: "OK", outcome: data as AccessOutcome };
  } catch {
    return { status: "NETWORK_ERROR" };
  }
}
