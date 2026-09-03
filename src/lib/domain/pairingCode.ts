import { generateRandomDigitCode, isValidDigitCode } from "./randomDigitCode";

const PAIRING_CODE_LENGTH = 6;
export const PAIRING_CODE_TTL_MINUTES = 10;

/**
 * Código temporal de vinculación de dispositivos. Mismo formato que el PIN
 * de asistencia (6 dígitos) pero es un concepto de negocio distinto: nunca
 * identifica a un cliente ni sirve como credencial administrativa.
 */
export function generatePairingCode(): string {
  return generateRandomDigitCode(PAIRING_CODE_LENGTH);
}

export function isValidPairingCode(code: string): boolean {
  return isValidDigitCode(code, PAIRING_CODE_LENGTH);
}
