import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarCheck,
  CreditCard,
  DollarSign,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as dashboardService from "@/lib/services/dashboardService";
import { formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { PeriodSelector } from "./PeriodSelector";
import { RevenueChartSection } from "./RevenueChartSection";
import { ClientGrowthSection } from "./ClientGrowthSection";
import { AttendanceInsightsSection } from "./AttendanceInsightsSection";
import { PlansSection } from "./PlansSection";
import { AlertsSection } from "./AlertsSection";
import { ClientInsightsSection } from "./ClientInsightsSection";
import { useDashboardSection } from "./useDashboardSection";
import type { DashboardPeriod } from "@/lib/domain/dashboardPeriod";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gymId = user?.gymId ?? null;

  const [period, setPeriod] = useState<DashboardPeriod>({ kind: "YEAR", year: new Date().getFullYear() });

  const summary = useDashboardSection(
    () => (gymId ? dashboardService.getDashboardSummary(gymId) : Promise.reject(new Error("no gym"))),
    [gymId],
  );
  const revenueTrend = useDashboardSection(
    () => (gymId ? dashboardService.getRevenueTrend(gymId, { kind: "MONTH" }) : Promise.reject(new Error("no gym"))),
    [gymId],
  );
  const newClientsTrend = useDashboardSection(
    () =>
      gymId ? dashboardService.getNewClientsTrend(gymId, { kind: "MONTH" }) : Promise.reject(new Error("no gym")),
    [gymId],
  );
  const pendingPayments = useDashboardSection(
    () => (gymId ? dashboardService.getPendingPayments(gymId) : Promise.reject(new Error("no gym"))),
    [gymId],
  );
  const years = useDashboardSection(
    () => (gymId ? dashboardService.getAvailableYears(gymId) : Promise.reject(new Error("no gym"))),
    [gymId],
  );

  if (!gymId) {
    return (
      <div className="text-sm text-muted-foreground">
        Este usuario no tiene un gimnasio asociado. El panel de Superadmin llegará en una fase futura.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clientes activos"
          value={summary.data ? summary.data.activeClients.toLocaleString("es-CO") : "—"}
          hint={summary.data ? `${summary.data.totalClients.toLocaleString("es-CO")} clientes en total` : undefined}
          icon={Users}
          tone="primary"
          onClick={() => navigate("/clientes?status=ACTIVE")}
        />
        <StatCard
          label="Nuevos clientes"
          value={newClientsTrend.data ? newClientsTrend.data.current.toLocaleString("es-CO") : "—"}
          hint="Este mes"
          icon={UserPlus}
          tone="primary"
          delay={0.03}
          trend={newClientsTrend.data ? { value: newClientsTrend.data.percentChange, label: "vs. mes anterior" } : undefined}
        />
        <StatCard
          label="Membresías por vencer"
          value={summary.data ? summary.data.expiringMemberships.toLocaleString("es-CO") : "—"}
          hint="Próximos 7 días"
          icon={CreditCard}
          tone="warning"
          delay={0.05}
          onClick={() => navigate("/membresias?status=EXPIRING_SOON")}
        />
        <StatCard
          label="Membresías vencidas"
          value={summary.data ? summary.data.expiredMemberships.toLocaleString("es-CO") : "—"}
          hint="Requieren renovación"
          icon={AlertTriangle}
          tone="danger"
          delay={0.1}
          onClick={() => navigate("/membresias?status=EXPIRED")}
        />
        <StatCard
          label="Ingresos del mes"
          value={revenueTrend.data ? formatCurrency(revenueTrend.data.current) : "—"}
          hint="Pagos registrados"
          icon={DollarSign}
          tone="success"
          delay={0.12}
          trend={revenueTrend.data ? { value: revenueTrend.data.percentChange, label: "vs. mes anterior" } : undefined}
        />
        <StatCard
          label="Pagos pendientes"
          value={pendingPayments.data ? pendingPayments.data.count.toLocaleString("es-CO") : "—"}
          hint={pendingPayments.data ? formatCurrency(pendingPayments.data.total) : undefined}
          icon={CreditCard}
          tone="warning"
          delay={0.15}
          onClick={() => navigate("/pagos?status=PENDING")}
        />
        <StatCard
          label="Asistencia de hoy"
          value={summary.data ? summary.data.attendanceToday.toLocaleString("es-CO") : "—"}
          hint={summary.data ? `${summary.data.attendanceWeek.toLocaleString("es-CO")} en los últimos 7 días` : undefined}
          icon={CalendarCheck}
          tone="primary"
          delay={0.18}
          onClick={() => navigate("/asistencia?range=today")}
        />
        <StatCard
          label="Entrenadores activos"
          value={summary.data ? summary.data.activeTrainers.toLocaleString("es-CO") : "—"}
          icon={UserCog}
          tone="primary"
          delay={0.2}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Periodo de análisis (ingresos, planes y ranking de asistencia)
        </h2>
        <PeriodSelector period={period} onChange={setPeriod} availableYears={years.data ?? []} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RevenueChartSection gymId={gymId} period={period} />
        <AlertsSection gymId={gymId} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ClientGrowthSection gymId={gymId} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AttendanceInsightsSection gymId={gymId} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlansSection gymId={gymId} period={period} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClientInsightsSection gymId={gymId} period={period} />
      </div>
    </div>
  );
}
