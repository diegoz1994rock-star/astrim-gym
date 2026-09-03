import { DashboardSectionCard } from "./DashboardSectionCard";
import { useDashboardSection } from "./useDashboardSection";
import * as dashboardService from "@/lib/services/dashboardService";
import type { DashboardPeriod } from "@/lib/domain/dashboardPeriod";
import { formatCurrency } from "@/lib/format";

interface PlansSectionProps {
  gymId: string;
  period: DashboardPeriod;
}

export function PlansSection({ gymId, period }: PlansSectionProps) {
  const topPlans = useDashboardSection(
    () => dashboardService.getTopPlans(gymId, period),
    [gymId, JSON.stringify(period)],
  );
  const revenueByPlan = useDashboardSection(
    () => dashboardService.getRevenueByPlan(gymId, period),
    [gymId, JSON.stringify(period)],
  );

  return (
    <>
      <DashboardSectionCard
        title="Membresías más vendidas"
        loading={topPlans.loading}
        error={topPlans.error}
        onRetry={topPlans.retry}
        isEmpty={!topPlans.loading && !topPlans.error && (topPlans.data ?? []).length === 0}
        emptyMessage="Aún no hay ventas de planes registradas en este periodo."
        skeletonHeight="h-32"
      >
        <ul className="flex flex-col gap-2">
          {(topPlans.data ?? []).map((row) => (
            <li key={row.plan_id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{row.plan_name}</span>
              <span className="font-semibold text-foreground">{row.sales}</span>
            </li>
          ))}
        </ul>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Ingresos por plan"
        loading={revenueByPlan.loading}
        error={revenueByPlan.error}
        onRetry={revenueByPlan.retry}
        isEmpty={!revenueByPlan.loading && !revenueByPlan.error && (revenueByPlan.data ?? []).length === 0}
        emptyMessage="Aún no hay ingresos vinculados a planes en este periodo."
        skeletonHeight="h-32"
      >
        <ul className="flex flex-col gap-2">
          {(revenueByPlan.data ?? []).map((row) => (
            <li key={row.plan_id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{row.plan_name}</span>
              <span className="font-semibold text-foreground">{formatCurrency(row.total)}</span>
            </li>
          ))}
        </ul>
      </DashboardSectionCard>
    </>
  );
}
