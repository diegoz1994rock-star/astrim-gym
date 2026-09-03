import type { RevenuePoint } from "@/types/db";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/**
 * (actual - anterior) / anterior * 100. Si no hay periodo anterior válido
 * (0, null o undefined) devuelve null — la UI debe mostrar "Sin
 * comparación disponible" en vez de inventar un porcentaje.
 */
export function computePercentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Garantiza los 12 meses de `year` en orden, con $0 real (no inventado)
 * donde el gimnasio no tuvo pagos ese mes. Nunca agrega meses fuera del
 * año pedido ni rellena con valores distintos de los que ya vinieron de
 * la base de datos.
 */
export function fillYearMonths(year: number, rows: RevenuePoint[]): RevenuePoint[] {
  const byMonth = new Map(rows.map((row) => [row.month, row.total]));
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    return { month, total: byMonth.get(month) ?? 0 };
  });
}

export interface WeekdayCount {
  dayLabel: string;
  count: number;
}

/** Garantiza los 7 días (lunes a domingo) aunque algún día no tenga
 * asistencias registradas — con 0 real, no omitido ni inventado. */
export function fillWeekDays(rows: { day_label: string; count: number }[]): WeekdayCount[] {
  const byDay = new Map(rows.map((row) => [row.day_label, row.count]));
  return WEEKDAY_LABELS.map((dayLabel) => ({ dayLabel, count: byDay.get(dayLabel) ?? 0 }));
}

export interface RevenueChartPoint {
  month: string;
  total: number;
  trend: number | null;
}

/**
 * Media móvil de `window` meses sobre los totales reales — es la "línea de
 * tendencia" de la gráfica anual. No es un dato nuevo: es un promedio
 * matemático de los mismos valores reales ya mostrados en las barras.
 * `null` en los primeros meses donde aún no hay suficiente historial para
 * promediar (nunca se rellena con un número inventado).
 */
export function computeMovingAverage(points: RevenuePoint[], window: number): RevenueChartPoint[] {
  return points.map((point, index) => {
    if (index + 1 < window) return { ...point, trend: null };
    const slice = points.slice(index + 1 - window, index + 1);
    const avg = slice.reduce((sum, p) => sum + p.total, 0) / window;
    return { ...point, trend: avg };
  });
}
