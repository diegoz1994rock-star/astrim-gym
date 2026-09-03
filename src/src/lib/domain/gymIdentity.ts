/**
 * Identidad del gimnasio autenticado (nombre a mostrar en el sidebar), NO
 * la marca del software (ASTRIM). Nunca debe caer de vuelta a "ASTRIM GYM":
 * si el gimnasio todavía no tiene nombre configurado, se usa un fallback
 * neutro que dejar claro que es un dato pendiente, no la marca.
 */
export const FALLBACK_GYM_NAME = "Mi gimnasio";

export function resolveGymDisplayName(gymName: string | null | undefined): string {
  return gymName?.trim() || FALLBACK_GYM_NAME;
}
