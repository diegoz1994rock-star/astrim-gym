import { computeMembershipStatus, type MembershipStatus } from "./membershipStatus";

/** Estados de membresía que permiten autorizar la entrada. */
const MEMBERSHIP_STATUSES_ALLOWING_ENTRY: readonly MembershipStatus[] = [
  "ACTIVE",
  "EXPIRING_SOON",
];

export interface OpenAttendanceInfo {
  /** Segundos transcurridos desde el check_in de esa sesión abierta. */
  secondsSinceEntry: number;
}

export interface AccessEvaluationInput {
  clientFound: boolean;
  clientStatus?: "ACTIVE" | "INACTIVE";
  membershipEndDate?: string | null;
  membershipManualStatus?: "SUSPENDED" | "CANCELLED" | null;
  openAttendance: OpenAttendanceInfo | null;
  duplicateWindowSeconds: number;
  today?: Date;
}

export type AccessDecision =
  | { kind: "ENTRY_ALLOWED" }
  | { kind: "EXIT_ALLOWED" }
  | { kind: "DUPLICATE_IGNORED"; secondsSinceEntry: number }
  | { kind: "DENIED_CODE_NOT_FOUND" }
  | { kind: "DENIED_CLIENT_INACTIVE" }
  | { kind: "DENIED_MEMBERSHIP_INVALID"; membershipStatus: MembershipStatus | null };

/**
 * Regla pura de autorización de acceso, sin tocar la base de datos: el
 * mismo código autodetecta entrada/salida según si ya existe una
 * asistencia abierta. Nunca compara un PIN contra un valor fijo — todo lo
 * que recibe ya viene resuelto por el llamador desde datos reales.
 */
export function evaluateAccess(input: AccessEvaluationInput): AccessDecision {
  if (!input.clientFound) {
    return { kind: "DENIED_CODE_NOT_FOUND" };
  }

  if (input.clientStatus !== "ACTIVE") {
    return { kind: "DENIED_CLIENT_INACTIVE" };
  }

  if (input.openAttendance) {
    if (input.openAttendance.secondsSinceEntry < input.duplicateWindowSeconds) {
      return { kind: "DUPLICATE_IGNORED", secondsSinceEntry: input.openAttendance.secondsSinceEntry };
    }
    return { kind: "EXIT_ALLOWED" };
  }

  const membershipStatus = input.membershipEndDate
    ? computeMembershipStatus({
        endDate: input.membershipEndDate,
        manualStatus: input.membershipManualStatus ?? null,
        today: input.today,
      })
    : null;

  if (!membershipStatus || !MEMBERSHIP_STATUSES_ALLOWING_ENTRY.includes(membershipStatus)) {
    return { kind: "DENIED_MEMBERSHIP_INVALID", membershipStatus };
  }

  return { kind: "ENTRY_ALLOWED" };
}
