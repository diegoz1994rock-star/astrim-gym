import type { RecurrenceInput } from "@/types/class";

/** Tope duro para que una fecha "Hasta" muy lejana nunca genere una serie descontrolada. */
export const MAX_RECURRENCE_OCCURRENCES = 180;

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Genera las fechas concretas de una serie (diaria/semanal por día de
 * semana/mensual) entre startDate y recurrence.until, ambos incluidos.
 * startDate siempre queda incluida sin importar la regla — es la clase
 * que el administrador está creando en este momento, nunca debe perderse
 * por una combinación de días de semana que no la cubra.
 *
 * Mensual usa el mismo día-del-mes que startDate; si un mes no tiene ese
 * día (p. ej. 31 en febrero), JavaScript corre la fecha al mes siguiente
 * — limitación conocida y aceptable para esta primera versión.
 */
export function generateRecurrenceDates(startDate: string, recurrence: RecurrenceInput): string[] {
  const start = parseIsoDate(startDate);
  const until = parseIsoDate(recurrence.until);
  const dates = new Set<string>([startDate]);
  if (until.getTime() < start.getTime()) return Array.from(dates);

  if (recurrence.frequency === "DAILY") {
    const cursor = new Date(start);
    while (cursor.getTime() <= until.getTime() && dates.size < MAX_RECURRENCE_OCCURRENCES) {
      dates.add(toIsoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (recurrence.frequency === "WEEKLY") {
    const weekdays = new Set(recurrence.weekdays);
    const cursor = new Date(start);
    while (cursor.getTime() <= until.getTime() && dates.size < MAX_RECURRENCE_OCCURRENCES) {
      if (weekdays.has(cursor.getDay())) {
        dates.add(toIsoDate(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const dayOfMonth = start.getDate();
    const cursor = new Date(start);
    while (cursor.getTime() <= until.getTime() && dates.size < MAX_RECURRENCE_OCCURRENCES) {
      dates.add(toIsoDate(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(dayOfMonth);
    }
  }

  return Array.from(dates).sort();
}
