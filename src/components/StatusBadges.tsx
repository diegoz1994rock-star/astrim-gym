import { Badge } from "@/components/ui/badge";
import type { MembershipStatus } from "@/lib/domain/membershipStatus";
import type { PaymentStatus } from "@/types/payment";
import type { RoutineStatus } from "@/types/routine";
import { MEAL_PLAN_GOAL_LABELS, type MealPlanGoal, type MealPlanStatus } from "@/types/mealPlan";

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

const MEAL_PLAN_STATUS_META: Record<MealPlanStatus, { label: string; tone: "success" | "primary" | "neutral" }> = {
  ACTIVE: { label: "Activo", tone: "success" },
  FINISHED: { label: "Finalizado", tone: "primary" },
  INACTIVE: { label: "Inactivo", tone: "neutral" },
};

export function MealPlanStatusBadge({ status }: { status: MealPlanStatus }) {
  const meta = MEAL_PLAN_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const MEAL_PLAN_GOAL_TONE: Record<MealPlanGoal, "success" | "primary" | "warning" | "neutral"> = {
  PERDIDA_PESO: "warning",
  MANTENIMIENTO: "neutral",
  GANANCIA_MUSCULAR: "primary",
  RECOMPOSICION: "success",
  OTRO: "neutral",
};

export function MealPlanGoalBadge({ goal }: { goal: MealPlanGoal | null }) {
  if (!goal) return <Badge tone="neutral">Sin objetivo definido</Badge>;
  return <Badge tone={MEAL_PLAN_GOAL_TONE[goal]}>{MEAL_PLAN_GOAL_LABELS[goal]}</Badge>;
}
