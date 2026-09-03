import type { PaymentEditInput, PaymentFormInput } from "@/types/payment";
import { hasValidationErrors } from "./validation";

export type PaymentValidationErrors = Partial<Record<keyof PaymentFormInput, string>>;
export type PaymentEditValidationErrors = Partial<Record<keyof PaymentEditInput, string>>;
export { hasValidationErrors };

export function validatePaymentForm(input: PaymentFormInput): PaymentValidationErrors {
  const errors: PaymentValidationErrors = {};

  if (!input.clientId) {
    errors.clientId = "Selecciona un cliente.";
  }

  if (input.amount === null || Number.isNaN(input.amount) || input.amount <= 0) {
    errors.amount = "Ingresa un valor de pago válido.";
  }

  if (!input.date || Number.isNaN(new Date(`${input.date}T00:00:00`).getTime())) {
    errors.date = "Ingresa una fecha válida.";
  }

  return errors;
}

export function validatePaymentEditForm(input: PaymentEditInput): PaymentEditValidationErrors {
  const errors: PaymentEditValidationErrors = {};

  if (!input.method) {
    errors.method = "Selecciona un método de pago.";
  }

  return errors;
}
