import { useNavigate } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardSectionCard } from "./DashboardSectionCard";
import { useDashboardSection } from "./useDashboardSection";
import * as dashboardService from "@/lib/services/dashboardService";

interface AttendanceInsightsSectionProps {
  gymId: string;
}

const MIN_PEAK_HOUR_SAMPLES = 15;

export function AttendanceInsightsSection({ gymId }: AttendanceInsightsSectionProps) {
  const navigate = useNavigate();
  const weekly = useDashboardSection(() => dashboardService.getWeeklyAttendanceChart(gymId), [gymId]);
  const peak = useDashboardSection(() => dashboardService.getPeakHoursChart(gymId), [gymId]);

  const weeklyTotal = (weekly.data ?? []).reduce((sum, day) => sum + day.count, 0);
  const peakTotal = (peak.data ?? []).reduce((sum, row) => sum + row.count, 0);
  const peakChartData = (peak.data ?? []).map((row) => ({ hourLabel: `${row.hour}:00`, count: row.count }));

  return (
    <>
      <DashboardSectionCard
        title="Asistencia de la semana"
        loading={weekly.loading}
        error={weekly.error}
        onRetry={weekly.retry}
        isEmpty={!weekly.loading && !weekly.error && weeklyTotal === 0}
        emptyMessage="Aún no hay asistencias registradas esta semana."
        actions={
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => navigate("/asistencia?range=today")}
          >
            Ver asistencia de hoy
          </button>
        }
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly.data ?? []}>
              <XAxis
                dataKey="dayLabel"
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
              <Bar dataKey="count" name="Asistencias" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Horas de mayor afluencia"
        loading={peak.loading}
        error={peak.error}
        onRetry={peak.retry}
        isEmpty={!peak.loading && !peak.error && peakTotal < MIN_PEAK_HOUR_SAMPLES}
        emptyMessage="Aún no hay suficientes datos para determinar las horas de mayor afluencia."
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakChartData}>
              <XAxis
                dataKey="hourLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                interval="preserveStartEnd"
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
              <Bar dataKey="count" name="Check-ins" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardSectionCard>
    </>
  );
}
