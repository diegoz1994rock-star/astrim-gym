export const EXPIRING_SOON_THRESHOLD_DAYS = 7;

export type MembershipStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";

interface MembershipStatusInput {
  endDate: string; // "YYYY-MM-DD"
  manualStatus?: "SUSPENDED" | "CANCELLED" | null;
  today?: Date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * El estado de una membresía nunca se escribe a mano: se calcula siempre
 * a partir de la fecha de vencimiento, salvo que el administrador la haya
 * suspendido o cancelado explícitamente (manualStatus).
 */
export function computeMembershipStatus({
  endDate,
  manualStatus = null,
  today = new Date(),
}: MembershipStatusInput): MembershipStatus {
  if (manualStatus === "SUSPENDED") return "SUSPENDED";
  if (manualStatus === "CANCELLED") return "CANCELLED";

  const end = startOfDay(new Date(`${endDate}T00:00:00`));
  const diffDays = Math.round((end.getTime() - startOfDay(today).getTime()) / 86_400_000);

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= EXPIRING_SOON_THRESHOLD_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}
