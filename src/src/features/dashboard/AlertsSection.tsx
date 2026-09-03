import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, CreditCard, UserX } from "lucide-react";
import { DashboardSectionCard } from "./DashboardSectionCard";
import { useDashboardSection } from "./useDashboardSection";
import * as dashboardService from "@/lib/services/dashboardService";
import type { DashboardAlert } from "@/lib/services/dashboardService";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface AlertsSectionProps {
  gymId: string;
}

const ALERT_META: Record<
  DashboardAlert["kind"],
  { icon: typeof AlertTriangle; tone: "danger" | "warning"; label: (a: DashboardAlert) => string; to: string }
> = {
  EXPIRED_MEMBERSHIPS: {
    icon: AlertTriangle,
    tone: "danger",
    label: (a) => `${a.count} membresía${a.count === 1 ? "" : "s"} vencida${a.count === 1 ? "" : "s"}`,
    to: "/membresias?status=EXPIRED",
  },
  EXPIRING_MEMBERSHIPS: {
    icon: Clock,
    tone: "warning",
    label: (a) => `${a.count} membresía${a.count === 1 ? "" : "s"} por vencer`,
    to: "/membresias?status=EXPIRING_SOON",
  },
  LOW_ATTENDANCE_CLIENTS: {
    icon: UserX,
    tone: "warning",
    label: (a) => `${a.count} cliente${a.count === 1 ? "" : "s"} sin asistir hace tiempo`,
    to: "/clientes?status=ACTIVE",
  },
  PENDING_PAYMENTS: {
    icon: CreditCard,
    tone: "danger",
    label: (a) =>
      a.kind === "PENDING_PAYMENTS"
        ? `${a.count} pago${a.count === 1 ? "" : "s"} pendiente${a.count === 1 ? "" : "s"} (${formatCurrency(a.total)})`
        : "",
    to: "/pagos?status=PENDING",
  },
};

export function AlertsSection({ gymId }: AlertsSectionProps) {
  const navigate = useNavigate();
  const alerts = useDashboardSection(() => dashboardService.getAlerts(gymId), [gymId]);

  return (
    <DashboardSectionCard
      title="Atención requerida"
      loading={alerts.loading}
      error={alerts.error}
      onRetry={alerts.retry}
      isEmpty={!alerts.loading && !alerts.error && (alerts.data ?? []).length === 0}
      emptyMessage="Todo en orden: no hay alertas pendientes."
      skeletonHeight="h-32"
    >
      <ul className="flex flex-col gap-2">
        {(alerts.data ?? []).map((alert) => {
          const meta = ALERT_META[alert.kind];
          const Icon = meta.icon;
          return (
            <li key={alert.kind}>
              <button
                type="button"
                onClick={() => navigate(meta.to)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {meta.label(alert)}
                </span>
                <Badge tone={meta.tone}>Ver</Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </DashboardSectionCard>
  );
}
