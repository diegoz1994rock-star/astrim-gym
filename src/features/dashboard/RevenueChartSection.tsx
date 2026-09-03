import { useState } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardSectionCard } from "./DashboardSectionCard";
import { useDashboardSection } from "./useDashboardSection";
import * as dashboardService from "@/lib/services/dashboardService";
import type { DashboardPeriod } from "@/lib/domain/dashboardPeriod";
import { formatCurrency } from "@/lib/format";

interface RevenueChartSectionProps {
  gymId: string;
  period: DashboardPeriod;
}

export function RevenueChartSection({ gymId, period }: RevenueChartSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const chart = useDashboardSection(
    () => dashboardService.getRevenueChartData(gymId, period),
    [gymId, JSON.stringify(period)],
  );
  const detail = useDashboardSection(
    () => (selectedMonth ? dashboardService.getMonthDetail(gymId, selectedMonth) : Promise.resolve(null)),
    [gymId, selectedMonth],
  );

  const hasRevenue = (chart.data ?? []).some((point) => point.total > 0);

  return (
    <DashboardSectionCard
      title="Ingresos"
      loading={chart.loading}
      error={chart.error}
      onRetry={chart.retry}
      isEmpty={!chart.loading && !chart.error && !hasRevenue}
      emptyMessage="Aún no hay ingresos registrados en este periodo."
      className="xl:col-span-2"
      skeletonHeight="h-80"
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chart.data ?? []}
            onClick={(state) => {
              const index = typeof state?.activeIndex === "number" ? state.activeIndex : undefined;
              const month = index !== undefined ? chart.data?.[index]?.month : undefined;
              if (month) setSelectedMonth(month);
            }}
          >
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
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "trend" ? "Tendencia (3 meses)" : "Ingresos",
              ]}
            />
            <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} cursor="pointer" />
            <Line
              type="monotone"
              dataKey="trend"
              stroke="var(--color-warning)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Toca una barra para ver el detalle del mes.</p>

      {selectedMonth && (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
          {detail.loading ? (
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          ) : detail.error ? (
            <p className="text-sm text-muted-foreground">No se pudo cargar el detalle de este mes.</p>
          ) : detail.data ? (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Ingresos</p>
                <p className="font-semibold text-foreground">{formatCurrency(detail.data.revenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pagos registrados</p>
                <p className="font-semibold text-foreground">{detail.data.paymentsCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nuevos clientes</p>
                <p className="font-semibold text-foreground">{detail.data.newClients}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Renovaciones</p>
                <p className="font-semibold text-foreground">{detail.data.renewals}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DashboardSectionCard>
  );
}
