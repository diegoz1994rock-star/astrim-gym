import { generateRandomDigitCode, isValidDigitCode } from "./randomDigitCode";

const CODE_LENGTH = 6;

export function generateAttendanceCode(): string {
  return generateRandomDigitCode(CODE_LENGTH);
}

export function isValidAttendanceCode(code: string): boolean {
  return isValidDigitCode(code, CODE_LENGTH);
}
