/**
 * Generador genérico de códigos numéricos aleatorios (crypto.getRandomValues
 * + rechazo de muestreo para no sesgar los dígitos bajos). Lo comparten el
 * PIN de asistencia del cliente (6 dígitos) y el código de vinculación de
 * dispositivos (también 6 dígitos, pero un concepto de negocio distinto):
 * un mismo algoritmo probado, sin duplicar la implementación.
 */
export function generateRandomDigitCode(length: number): string {
  const maxExclusive = 10 ** length;
  const rejectionCeiling = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= rejectionCeiling);
  return String(value % maxExclusive).padStart(length, "0");
}

export function isValidDigitCode(code: string, length: number): boolean {
  return new RegExp(`^\\d{${length}}$`).test(code);
}
