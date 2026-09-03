import { Badge } from "@/components/ui/badge";
import type { MembershipStatus } from "@/lib/domain/membershipStatus";
import type { PaymentStatus } from "@/types/payment";
import type { RoutineStatus } from "@/types/routine";

type ActiveStatus = "ACTIVE" | "INACTIVE";

const ACTIVE_STATUS_META: Record<ActiveStatus, { label: string; tone: "success" | "neutral" }> = {
  ACTIVE: { label: "Activo", tone: "success" },
  INACTIVE: { label: "Inactivo", tone: "neutral" },
};

/** Usado tanto para clientes como para entrenadores: mismo esquema ACTIVE/INACTIVE. */
export function ActiveStatusBadge({ status }: { status: ActiveStatus }) {
  const meta = ACTIVE_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const MEMBERSHIP_STATUS_META: Record<
  MembershipStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  ACTIVE: { label: "Activa", tone: "success" },
  EXPIRING_SOON: { label: "Por vencer", tone: "warning" },
  EXPIRED: { label: "Vencida", tone: "danger" },
  SUSPENDED: { label: "Suspendida", tone: "neutral" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
};

export function MembershipStatusBadge({ status }: { status: MembershipStatus | null }) {
  if (!status) return <Badge tone="neutral">Sin membresía</Badge>;
  const meta = MEMBERSHIP_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: "success" | "warning" }> = {
  PAID: { label: "Pagado", tone: "success" },
  PENDING: { label: "Pendiente", tone: "warning" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const ROUTINE_STATUS_META: Record<RoutineStatus, { label: string; tone: "success" | "primary" | "neutral" }> = {
  ACTIVE: { label: "Activa", tone: "success" },
  FINISHED: { label: "Finalizada", tone: "primary" },
  INACTIVE: { label: "Inactiva", tone: "neutral" },
};

export function RoutineStatusBadge({ status }: { status: RoutineStatus }) {
  const meta = ROUTINE_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
