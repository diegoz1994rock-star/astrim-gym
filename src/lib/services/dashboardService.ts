import * as dashboardRepo from "../repositories/dashboardRepository";
import * as clientRepo from "../repositories/clientRepository";
import * as paymentRepo from "../repositories/paymentRepository";
import * as membershipRepo from "../repositories/membershipRepository";
import * as attendanceRepo from "../repositories/attendanceRepository";
import { computeMembershipStatus } from "../domain/membershipStatus";
import {
  computeMovingAverage,
  computePercentChange,
  fillWeekDays,
  fillYearMonths,
  type RevenueChartPoint,
} from "../domain/dashboardMetrics";
import { resolvePeriodRange, type DashboardPeriod } from "../domain/dashboardPeriod";
import { formatMonthLabel } from "@/lib/format";
import type { RevenuePoint } from "@/types/db";

export interface DashboardSummary {
  totalClients: number;
  activeClients: number;
  expiringMemberships: number;
  expiredMemberships: number;
  activeTrainers: number;
  monthlyRevenue: number;
  attendanceToday: number;
  attendanceWeek: number;
  revenueSeries: RevenuePoint[];
}

export async function getDashboardSummary(gymId: string): Promise<DashboardSummary> {
  const [clientStats, memberships, activeTrainers, monthlyRevenue, attendance, revenueSeries] =
    await Promise.all([
      dashboardRepo.getClientStats(gymId),
      dashboardRepo.getLatestMembershipsPerClient(gymId),
      dashboardRepo.getTrainerCount(gymId),
      dashboardRepo.getMonthlyRevenue(gymId),
      dashboardRepo.getAttendanceCounts(gymId),
      dashboardRepo.getRevenueSeries(gymId, 6),
    ]);

  let expiringMemberships = 0;
  let expiredMemberships = 0;
  for (const membership of memberships) {
    const status = computeMembershipStatus({
      endDate: membership.end_date,
      manualStatus: membership.manual_status,
    });
    if (status === "EXPIRING_SOON") expiringMemberships += 1;
    if (status === "EXPIRED") expiredMemberships += 1;
  }

  return {
    totalClients: clientStats.total,
    activeClients: clientStats.active,
    expiringMemberships,
    expiredMemberships,
    activeTrainers,
    monthlyRevenue,
    attendanceToday: attendance.today,
    attendanceWeek: attendance.week,
    revenueSeries,
  };
}

export interface Trend {
  current: number;
  percentChange: number | null;
}

async function withTrend(
  gymId: string,
  range: ReturnType<typeof resolvePeriodRange>,
  fetchTotal: (gymId: string, start: string, end: string) => Promise<number>,
): Promise<Trend> {
  const current = await fetchTotal(gymId, range.start, range.end);
  if (!range.previousStart || !range.previousEnd) return { current, percentChange: null };
  const previous = await fetchTotal(gymId, range.previousStart, range.previousEnd);
  return { current, percentChange: computePercentChange(current, previous) };
}

/** Ingresos del periodo seleccionado + comparación real con el periodo
 * anterior equivalente (nunca inventada: null si no hay periodo anterior). */
export async function getRevenueTrend(gymId: string, period: DashboardPeriod): Promise<Trend> {
  const range = resolvePeriodRange(period);
  return withTrend(gymId, range, paymentRepo.getRevenueForPeriod);
}

export async function getNewClientsTrend(gymId: string, period: DashboardPeriod): Promise<Trend> {
  const range = resolvePeriodRange(period);
  return withTrend(gymId, range, clientRepo.getNewClientsCount);
}

export async function getAttendanceTrend(gymId: string, period: DashboardPeriod): Promise<Trend> {
  const range = resolvePeriodRange(period);
  return withTrend(gymId, range, (gid, start, end) =>
    attendanceRepo.getTopAttendees(gid, start, end, 1_000_000).then((rows) =>
      rows.reduce((sum, row) => sum + row.visits, 0),
    ),
  );
}

/** Ingresos reales de los 12 meses del año pedido (relleno de $0 real
 * donde no hubo pagos, nunca datos inventados). */
export async function getYearlyRevenue(
  gymId: string,
  year: number,
): Promise<{ month: string; label: string; total: number }[]> {
  const rows = await paymentRepo.getRevenueSeriesForRange(gymId, `${year}-01-01`, `${year}-12-31`);
  return fillYearMonths(year, rows).map((point) => ({
    ...point,
    label: formatMonthLabel(point.month),
  }));
}

/** Años reales con pagos, para poblar el selector de año del Dashboard
 * (nunca un rango de años arbitrario). Siempre incluye el año actual aunque
 * todavía no tenga pagos, para que el usuario pueda elegirlo. */
export async function getAvailableYears(gymId: string): Promise<number[]> {
  const years = await paymentRepo.getAvailableRevenueYears(gymId);
  const currentYear = new Date().getFullYear();
  return years.includes(currentYear) ? years : [currentYear, ...years].sort((a, b) => b - a);
}

export interface RevenueChartLabeledPoint extends RevenueChartPoint {
  label: string;
}

/** Datos reales de la gráfica de ingresos (barras + línea de tendencia)
 * para el periodo elegido en el selector. Cuando el periodo es "Año
 * completo" se garantizan los 12 meses con $0 real; para los demás
 * periodos solo se devuelven los meses que caen dentro del rango. */
export async function getRevenueChartData(
  gymId: string,
  period: DashboardPeriod,
): Promise<RevenueChartLabeledPoint[]> {
  const range = resolvePeriodRange(period);
  const rows =
    period.kind === "YEAR"
      ? fillYearMonths(period.year ?? new Date().getFullYear(), await paymentRepo.getRevenueSeriesForRange(gymId, range.start, range.end))
      : await paymentRepo.getRevenueSeriesForRange(gymId, range.start, range.end);
  const withTrend = computeMovingAverage(rows, 3);
  return withTrend.map((point) => ({ ...point, label: formatMonthLabel(point.month) }));
}

export interface MonthDetail {
  month: string;
  revenue: number;
  paymentsCount: number;
  newClients: number;
  renewals: number;
}

export async function getMonthDetail(gymId: string, month: string): Promise<MonthDetail> {
  const [year, monthNum] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, "0")}`;
  const [revenue, paymentsCount, newClients, renewals] = await Promise.all([
    paymentRepo.getRevenueForPeriod(gymId, start, end),
    paymentRepo.getPaymentsCount(gymId, start, end),
    clientRepo.getNewClientsCount(gymId, start, end),
    membershipRepo.getRenewalsCount(gymId, start, end),
  ]);
  return { month, revenue, paymentsCount, newClients, renewals };
}

export interface ClientGrowthPoint {
  month: string;
  label: string;
  newClients: number;
  deactivations: number;
}

export async function getClientGrowth(gymId: string, monthsBack: number): Promise<ClientGrowthPoint[]> {
  const range = resolvePeriodRange({ kind: monthsBack <= 3 ? "LAST_3_MONTHS" : "LAST_6_MONTHS" });
  const [newSeries, deactivationSeries] = await Promise.all([
    clientRepo.getNewClientsSeries(gymId, range.start, range.end),
    clientRepo.getDeactivationsSeries(gymId, range.start, range.end),
  ]);
  const newByMonth = new Map(newSeries.map((row) => [row.month, row.count]));
  const deactivatedByMonth = new Map(deactivationSeries.map((row) => [row.month, row.count]));
  const months: string[] = [];
  const cursor = new Date(`${range.start}T00:00:00`);
  const endDate = new Date(`${range.end}T00:00:00`);
  while (cursor <= endDate) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months.map((month) => ({
    month,
    label: formatMonthLabel(month),
    newClients: newByMonth.get(month) ?? 0,
    deactivations: deactivatedByMonth.get(month) ?? 0,
  }));
}

export async function getWeeklyAttendanceChart(gymId: string) {
  const range = resolvePeriodRange({ kind: "WEEK" });
  const rows = await attendanceRepo.getWeeklyAttendance(gymId, range.start, range.end);
  return fillWeekDays(rows);
}

export async function getPeakHoursChart(gymId: string) {
  const range = resolvePeriodRange({ kind: "LAST_3_MONTHS" });
  return attendanceRepo.getPeakHours(gymId, range.start, range.end);
}

export async function getTopPlans(gymId: string, period: DashboardPeriod) {
  const range = resolvePeriodRange(period);
  return membershipRepo.getPlanSalesCount(gymId, range.start, range.end);
}

export async function getRevenueByPlan(gymId: string, period: DashboardPeriod) {
  const range = resolvePeriodRange(period);
  return paymentRepo.getRevenueByPlan(gymId, range.start, range.end);
}

export async function getMostConsistentClients(gymId: string, period: DashboardPeriod, limit: number) {
  const range = resolvePeriodRange(period);
  return attendanceRepo.getTopAttendees(gymId, range.start, range.end, limit);
}

const INACTIVE_ATTENDANCE_THRESHOLD_DAYS = 10;

export async function getInactiveClients(gymId: string) {
  return clientRepo.getClientsWithLowAttendance(gymId, INACTIVE_ATTENDANCE_THRESHOLD_DAYS);
}

export type DashboardAlert =
  | { kind: "EXPIRED_MEMBERSHIPS"; count: number }
  | { kind: "EXPIRING_MEMBERSHIPS"; count: number }
  | { kind: "LOW_ATTENDANCE_CLIENTS"; count: number }
  | { kind: "PENDING_PAYMENTS"; count: number; total: number };

/** Reutiliza exactamente las mismas reglas que ya calculan
 * getDashboardSummary/getInactiveClients — nunca duplica ni inventa un
 * umbral distinto al ya usado en el resto de la app. */
export async function getAlerts(gymId: string): Promise<DashboardAlert[]> {
  const [summary, inactiveClients, pending] = await Promise.all([
    getDashboardSummary(gymId),
    getInactiveClients(gymId),
    paymentRepo.getPendingPaymentsSummary(gymId),
  ]);

  const alerts: DashboardAlert[] = [];
  if (summary.expiredMemberships > 0) {
    alerts.push({ kind: "EXPIRED_MEMBERSHIPS", count: summary.expiredMemberships });
  }
  if (summary.expiringMemberships > 0) {
    alerts.push({ kind: "EXPIRING_MEMBERSHIPS", count: summary.expiringMemberships });
  }
  if (inactiveClients.length > 0) {
    alerts.push({ kind: "LOW_ATTENDANCE_CLIENTS", count: inactiveClients.length });
  }
  if (pending.count > 0) {
    alerts.push({ kind: "PENDING_PAYMENTS", count: pending.count, total: pending.total });
  }
  return alerts;
}

export async function getPendingPayments(gymId: string) {
  return paymentRepo.getPendingPaymentsSummary(gymId);
}
