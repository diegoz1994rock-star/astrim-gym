export type DashboardPeriodKind =
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "YEAR"
  | "LAST_YEAR"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "CUSTOM";

export interface DashboardPeriod {
  kind: DashboardPeriodKind;
  /** Solo se usa con kind "YEAR"; por defecto el año de `today`. */
  year?: number;
  /** Solo se usa con kind "CUSTOM". */
  customRange?: { start: string; end: string };
}

export interface ResolvedRange {
  start: string;
  end: string;
  previousStart: string | null;
  previousEnd: string | null;
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

/**
 * Traduce un periodo elegido por el usuario a un rango real de fechas
 * (más el rango equivalente anterior, para las comparaciones "+X% vs
 * periodo anterior"). Función pura: no toca la base de datos ni el reloj
 * del sistema salvo por el parámetro `today` explícito, para que sea
 * testeable de forma determinista.
 */
export function resolvePeriodRange(period: DashboardPeriod, today: Date = new Date()): ResolvedRange {
  switch (period.kind) {
    case "TODAY": {
      const iso = toISODate(today);
      const yesterday = toISODate(addDays(today, -1));
      return { start: iso, end: iso, previousStart: yesterday, previousEnd: yesterday };
    }
    case "WEEK": {
      const start = addDays(today, -6);
      const previousEnd = addDays(start, -1);
      const previousStart = addDays(previousEnd, -6);
      return {
        start: toISODate(start),
        end: toISODate(today),
        previousStart: toISODate(previousStart),
        previousEnd: toISODate(previousEnd),
      };
    }
    case "MONTH": {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      const previousMonth = addMonths(today, -1);
      return {
        start: toISODate(start),
        end: toISODate(end),
        previousStart: toISODate(startOfMonth(previousMonth)),
        previousEnd: toISODate(endOfMonth(previousMonth)),
      };
    }
    case "YEAR": {
      const year = period.year ?? today.getFullYear();
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        previousStart: `${year - 1}-01-01`,
        previousEnd: `${year - 1}-12-31`,
      };
    }
    case "LAST_YEAR": {
      const year = today.getFullYear() - 1;
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        previousStart: `${year - 1}-01-01`,
        previousEnd: `${year - 1}-12-31`,
      };
    }
    case "LAST_3_MONTHS":
    case "LAST_6_MONTHS": {
      const span = period.kind === "LAST_3_MONTHS" ? 3 : 6;
      const start = startOfMonth(addMonths(today, -(span - 1)));
      const end = endOfMonth(today);
      const previousEnd = addDays(start, -1);
      const previousStart = startOfMonth(addMonths(previousEnd, -(span - 1)));
      return {
        start: toISODate(start),
        end: toISODate(end),
        previousStart: toISODate(previousStart),
        previousEnd: toISODate(previousEnd),
      };
    }
    case "CUSTOM": {
      if (!period.customRange) {
        throw new Error("customRange es obligatorio cuando kind es CUSTOM.");
      }
      const { start, end } = period.customRange;
      const startDate = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      const spanDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
      const previousEnd = addDays(startDate, -1);
      const previousStart = addDays(previousEnd, -(spanDays - 1));
      return {
        start,
        end,
        previousStart: toISODate(previousStart),
        previousEnd: toISODate(previousEnd),
      };
    }
  }
}
