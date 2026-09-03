import * as clientRepository from "../repositories/clientRepository";
import * as attendanceRepository from "../repositories/attendanceRepository";
import { evaluateAccess } from "../domain/accessAuthorization";
import { isValidAttendanceCode } from "../domain/attendanceCode";
import { LocalSyncProvider } from "../sync/LocalSyncProvider";
import type { SyncProvider } from "../sync/SyncProvider";
import type { MembershipStatus } from "../domain/membershipStatus";

const syncProvider: SyncProvider = new LocalSyncProvider();

/**
 * Margen mínimo para ignorar un verdadero rebote de hardware/UI (el mismo
 * toque disparando dos veces casi instantáneamente). Nunca debe bloquear
 * una segunda visita real: pasado este margen, el mismo PIN con asistencia
 * abierta siempre se interpreta como salida (transición OPEN → COMPLETED).
 */
const DUPLICATE_BOUNCE_GUARD_SECONDS = 2;

export type AccessOutcome =
  | { kind: "ENTRY_ALLOWED"; clientName: string; time: string }
  | { kind: "EXIT_ALLOWED"; clientName: string; time: string; durationMinutes: number | null }
  | { kind: "DUPLICATE_IGNORED"; clientName: string }
  | { kind: "DENIED_CODE_NOT_FOUND" }
  | { kind: "DENIED_CLIENT_INACTIVE" }
  | { kind: "DENIED_MEMBERSHIP_INVALID"; membershipStatus: MembershipStatus | null };

function timeLabelFromHms(hms: string | null): string {
  return hms ? hms.slice(0, 5) : "";
}

/** Duración en minutos entre dos horas "HH:MM:SS" del mismo día. */
function durationMinutesBetween(checkIn: string, checkOut: string): number {
  const toSeconds = (hms: string) => {
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };
  return Math.max(0, Math.round((toSeconds(checkOut) - toSeconds(checkIn)) / 60));
}

/**
 * Punto de entrada único del kiosco de recepción. Nunca compara el código
 * contra un valor fijo: siempre resuelve el cliente real del gimnasio
 * actual y delega la decisión a evaluateAccess (dominio puro), reutilizando
 * clientRepository/attendanceRepository/computeMembershipStatus ya
 * existentes en el resto de la aplicación.
 */
export async function registerAccessEvent(
  gymId: string,
  code: string,
  deviceId: string | null,
): Promise<AccessOutcome> {
  if (!isValidAttendanceCode(code)) {
    return { kind: "DENIED_CODE_NOT_FOUND" };
  }

  const client = await clientRepository.findClientByAttendanceCode(gymId, code);
  const openAttendance = client
    ? await attendanceRepository.findOpenAttendanceWithElapsed(gymId, client.id)
    : null;
  const decision = evaluateAccess({
    clientFound: client !== null,
    clientStatus: client?.status,
    membershipEndDate: client?.membership_end_date ?? null,
    membershipManualStatus: client?.membership_manual_status ?? null,
    openAttendance: openAttendance ? { secondsSinceEntry: openAttendance.seconds_since_entry } : null,
    duplicateWindowSeconds: DUPLICATE_BOUNCE_GUARD_SECONDS,
  });

  switch (decision.kind) {
    case "DENIED_CODE_NOT_FOUND":
      return { kind: "DENIED_CODE_NOT_FOUND" };
    case "DENIED_CLIENT_INACTIVE":
      return { kind: "DENIED_CLIENT_INACTIVE" };
    case "DENIED_MEMBERSHIP_INVALID":
      return { kind: "DENIED_MEMBERSHIP_INVALID", membershipStatus: decision.membershipStatus };
    case "DUPLICATE_IGNORED":
      return { kind: "DUPLICATE_IGNORED", clientName: client!.name };
    case "ENTRY_ALLOWED": {
      const attendanceId = crypto.randomUUID();
      await attendanceRepository.createAttendance(gymId, attendanceId, {
        clientId: client!.id,
        membershipId: client!.membership_id,
        notes: null,
        entryMethod: "PIN",
        deviceId,
      });
      const row = await attendanceRepository.findAttendanceById(gymId, attendanceId);
      await syncProvider.enqueue(gymId, {
        attendanceId,
        clientId: client!.id,
        deviceId,
        eventType: "ENTRY",
      });
      return { kind: "ENTRY_ALLOWED", clientName: client!.name, time: timeLabelFromHms(row?.check_in ?? null) };
    }
    case "EXIT_ALLOWED": {
      await attendanceRepository.checkOutAttendance(gymId, openAttendance!.id, "PIN");
      const row = await attendanceRepository.findAttendanceById(gymId, openAttendance!.id);
      await syncProvider.enqueue(gymId, {
        attendanceId: openAttendance!.id,
        clientId: client!.id,
        deviceId,
        eventType: "EXIT",
      });
      return {
        kind: "EXIT_ALLOWED",
        clientName: client!.name,
        time: timeLabelFromHms(row?.check_out ?? null),
        durationMinutes:
          row?.check_in && row?.check_out ? durationMinutesBetween(row.check_in, row.check_out) : null,
      };
    }
  }
}
