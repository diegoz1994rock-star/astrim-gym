/**
 * Toda la aritmética de fechas de membresía vive aquí para no duplicarla
 * entre formularios, servicios o el listado. Usa el objeto Date nativo para
 * el desborde de mes/año y años bisiestos (JS lo resuelve correctamente al
 * usar setDate con un número de día fuera de rango).
 */

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Ej: inicio 2026-08-29 + 30 días → 2026-09-28. */
export function calculateEndDate(startDateIso: string, durationDays: number): string {
  return toIsoDate(addDays(parseIsoDate(startDateIso), durationDays));
}

/**
 * Fecha en la que debería empezar una renovación:
 * - Si la membresía actual todavía no venció, empieza al día siguiente de su
 *   vencimiento (para no quitarle días ya pagados al cliente).
 * - Si ya venció, empieza hoy.
 */
export function calculateRenewalStartDate(
  currentEndDateIso: string,
  today: Date = new Date(),
): string {
  const currentEnd = startOfDay(parseIsoDate(currentEndDateIso));
  const todayStart = startOfDay(today);

  if (todayStart.getTime() > currentEnd.getTime()) {
    return toIsoDate(todayStart);
  }
  return toIsoDate(addDays(currentEnd, 1));
}
