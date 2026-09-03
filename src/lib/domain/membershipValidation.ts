import type { MembershipEditInput, MembershipFormInput } from "@/types/membership";
import { hasValidationErrors } from "./validation";

export type MembershipValidationErrors = Partial<Record<keyof MembershipFormInput, string>>;
export type MembershipEditValidationErrors = Partial<Record<keyof MembershipEditInput, string>>;
export { hasValidationErrors };

export function validateMembershipForm(input: MembershipFormInput): MembershipValidationErrors {
  const errors: MembershipValidationErrors = {};

  if (!input.clientId) {
    errors.clientId = "Selecciona un cliente.";
  }

  if (!input.planId) {
    errors.planId = "Selecciona un plan.";
  }

  if (!input.startDate || Number.isNaN(new Date(`${input.startDate}T00:00:00`).getTime())) {
    errors.startDate = "Ingresa una fecha de inicio válida.";
  }

  if (input.price === null || Number.isNaN(input.price) || input.price < 0) {
    errors.price = "El precio no puede ser negativo.";
  }

  if (input.registerPayment) {
    if (input.paymentAmount === null || Number.isNaN(input.paymentAmount) || input.paymentAmount <= 0) {
      errors.paymentAmount = "Ingresa un valor de pago válido.";
    }
    if (!input.paymentDate || Number.isNaN(new Date(`${input.paymentDate}T00:00:00`).getTime())) {
      errors.paymentDate = "Ingresa una fecha de pago válida.";
    }
  }

  return errors;
}

export function validateMembershipEditForm(input: MembershipEditInput): MembershipEditValidationErrors {
  const errors: MembershipEditValidationErrors = {};

  const start = new Date(`${input.startDate}T00:00:00`);
  const end = new Date(`${input.endDate}T00:00:00`);

  if (!input.startDate || Number.isNaN(start.getTime())) {
    errors.startDate = "Ingresa una fecha de inicio válida.";
  }

  if (!input.endDate || Number.isNaN(end.getTime())) {
    errors.endDate = "Ingresa una fecha de vencimiento válida.";
  } else if (!Number.isNaN(start.getTime()) && end.getTime() < start.getTime()) {
    errors.endDate = "La fecha de vencimiento no puede ser anterior al inicio.";
  }

  if (input.price === null || Number.isNaN(input.price) || input.price < 0) {
    errors.price = "El precio no puede ser negativo.";
  }

  return errors;
}
