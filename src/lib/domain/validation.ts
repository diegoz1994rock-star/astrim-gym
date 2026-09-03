export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export function isFutureDate(isoDate: string, today: Date): boolean {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.getTime() > today.getTime();
}

export function hasValidationErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}

/**
 * Límites compartidos para medidas corporales, usados tanto por Progreso
 * (measurements) como por las medidas actuales del cliente (clients): son
 * la misma magnitud física y deben validarse con la misma regla en ambos
 * lugares para no tener criterios contradictorios. Límites amplios
 * pensados solo para detectar errores de tipeo evidentes, no para
 * restringir casos reales.
 */
export const BODY_MEASUREMENT_LIMITS = {
  weight: { min: 1, max: 400 },
  height: { min: 0.3, max: 2.5 },
  circumference: { min: 1, max: 300 }, // cintura, pecho, brazo, muslo, pantorrilla, cadera (cm)
  bodyFat: { min: 0, max: 100 }, // porcentaje
  muscleMass: { min: 1, max: 200 }, // kg
};

export function validatePositiveField(
  value: number | null,
  limits: { min: number; max: number },
  label: string,
): string | undefined {
  if (value === null) return undefined;
  if (!Number.isFinite(value)) return `${label} no es un número válido.`;
  if (value < limits.min || value > limits.max) {
    return `${label} debe estar entre ${limits.min} y ${limits.max}.`;
  }
  return undefined;
}

/**
 * La altura se guarda en metros (BODY_MEASUREMENT_LIMITS.height, IMC, DB)
 * en todo el proyecto, pero se muestra y se edita en centímetros en la
 * interfaz (Clientes y Progreso) por ser más natural para el usuario.
 * Estas funciones son el único punto de conversión: no cambiar el resto
 * del dominio a centímetros, solo el límite del formulario.
 */
export function metersToCm(meters: number): number {
  return Math.round(meters * 100);
}

export function cmToMeters(cm: number): number {
  return cm / 100;
}

export const HEIGHT_CM_LIMITS = { min: 30, max: 250 };
