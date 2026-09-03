import { describe, expect, it } from "vitest";
import {
  validateRegisterAttendanceInput,
  hasValidationErrors,
  isCheckOutBeforeCheckIn,
} from "./attendanceValidation";

describe("validateRegisterAttendanceInput", () => {
  it("1. acepta un registro válido", () => {
    const errors = validateRegisterAttendanceInput({ clientId: "client_1", notes: "" });
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("rechaza un registro sin cliente", () => {
    const errors = validateRegisterAttendanceInput({ clientId: "", notes: "" });
    expect(errors.clientId).toBeDefined();
  });
});

describe("isCheckOutBeforeCheckIn (punto 9)", () => {
  it("9. detecta un check-out anterior al check-in", () => {
    expect(isCheckOutBeforeCheckIn("10:00:00", "09:30:00")).toBe(true);
  });

  it("un check-out posterior al check-in es válido", () => {
    expect(isCheckOutBeforeCheckIn("09:00:00", "10:15:00")).toBe(false);
  });

  it("un check-out igual al check-in se considera válido (salida inmediata)", () => {
    expect(isCheckOutBeforeCheckIn("09:00:00", "09:00:00")).toBe(false);
  });
});
