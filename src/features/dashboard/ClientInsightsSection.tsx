import { useNavigate } from "react-router-dom";
import { DashboardSectionCard } from "./DashboardSectionCard";
import { useDashboardSection } from "./useDashboardSection";
import * as dashboardService from "@/lib/services/dashboardService";
import type { DashboardPeriod } from "@/lib/domain/dashboardPeriod";

interface ClientInsightsSectionProps {
  gymId: string;
  period: DashboardPeriod;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function ClientInsightsSection({ gymId, period }: ClientInsightsSectionProps) {
  const navigate = useNavigate();
  const inactive = useDashboardSection(() => dashboardService.getInactiveClients(gymId), [gymId]);
  const consistent = useDashboardSection(
    () => dashboardService.getMostConsistentClients(gymId, period, 5),
    [gymId, JSON.stringify(period)],
  );

  return (
    <>
      <DashboardSectionCard
        title="Clientes inactivos"
        loading={inactive.loading}
        error={inactive.error}
        onRetry={inactive.retry}
        isEmpty={!inactive.loading && !inactive.error && (inactive.data ?? []).length === 0}
        emptyMessage="Ningún cliente activo lleva mucho tiempo sin asistir."
        skeletonHeight="h-32"
      >
        <ul className="flex flex-col divide-y divide-border">
          {(inactive.data ?? []).map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => navigate(`/clientes/${client.id}`)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary"
              >
                <span className="text-foreground">{client.name}</span>
                <span className="text-muted-foreground">{client.days_without_attendance} días sin asistir</span>
              </button>
            </li>
          ))}
        </ul>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Clientes más constantes"
        loading={consistent.loading}
        error={consistent.error}
        onRetry={consistent.retry}
        isEmpty={!consistent.loading && !consistent.error && (consistent.data ?? []).length === 0}
        emptyMessage="Aún no hay suficientes asistencias en este periodo para armar un ranking."
        skeletonHeight="h-32"
      >
        <ul className="flex flex-col divide-y divide-border">
          {(consistent.data ?? []).map((client, index) => (
            <li key={client.client_id}>
              <button
                type="button"
                onClick={() => navigate(`/clientes/${client.client_id}`)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary"
              >
                <span className="flex items-center gap-2 text-foreground">
                  {MEDALS[index] ?? `${index + 1}.`} {client.client_name}
                </span>
                <span className="text-muted-foreground">{client.visits} visitas</span>
              </button>
            </li>
          ))}
        </ul>
      </DashboardSectionCard>
    </>
  );
}
