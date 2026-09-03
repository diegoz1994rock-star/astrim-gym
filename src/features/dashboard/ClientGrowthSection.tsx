import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardSectionCard } from "./DashboardSectionCard";
import { useDashboardSection } from "./useDashboardSection";
import * as dashboardService from "@/lib/services/dashboardService";

interface ClientGrowthSectionProps {
  gymId: string;
}

export function ClientGrowthSection({ gymId }: ClientGrowthSectionProps) {
  const growth = useDashboardSection(() => dashboardService.getClientGrowth(gymId, 6), [gymId]);
  const hasData = (growth.data ?? []).some((point) => point.newClients > 0 || point.deactivations > 0);

  return (
    <DashboardSectionCard
      title="Crecimiento de clientes"
      loading={growth.loading}
      error={growth.error}
      onRetry={growth.retry}
      isEmpty={!growth.loading && !growth.error && !hasData}
      emptyMessage="Aún no hay suficientes datos de altas o bajas en este periodo."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={growth.data ?? []}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="newClients" name="Nuevos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="deactivations" name="Bajas" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardSectionCard>
  );
}
