import type { RegisterAttendanceInput } from "@/types/attendance";
import { hasValidationErrors } from "./validation";

export type AttendanceValidationErrors = Partial<Record<keyof RegisterAttendanceInput, string>>;
export { hasValidationErrors };

export function validateRegisterAttendanceInput(
  input: RegisterAttendanceInput,
): AttendanceValidationErrors {
  const errors: AttendanceValidationErrors = {};

  if (!input.clientId) {
    errors.clientId = "Selecciona un cliente.";
  }

  return errors;
}

/**
 * check_in/check_out se generan siempre con time('now') en el repositorio
 * (nunca con el reloj del frontend), así que en el flujo normal esto nunca
 * podría fallar. Existe igualmente como función de dominio independiente
 * para proteger cualquier corrección futura de horarios.
 */
export function isCheckOutBeforeCheckIn(checkIn: string, checkOut: string): boolean {
  return checkOut < checkIn;
}
