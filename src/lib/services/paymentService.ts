import * as paymentRepository from "../repositories/paymentRepository";
import type { CreatePaymentInput } from "../repositories/paymentRepository";
import {
  validatePaymentForm,
  validatePaymentEditForm,
  hasValidationErrors,
} from "../domain/paymentValidation";
import type {
  PaymentEditValidationErrors,
  PaymentValidationErrors,
} from "../domain/paymentValidation";
import type { PaymentEditInput, PaymentFormInput, PaymentListItem } from "@/types/payment";
import type { PaymentRow } from "@/types/db";

export class PaymentValidationError extends Error {
  constructor(public errors: PaymentValidationErrors) {
    super("Los datos del pago no son válidos.");
  }
}

export class PaymentEditValidationError extends Error {
  constructor(public errors: PaymentEditValidationErrors) {
    super("Los datos del pago no son válidos.");
  }
}

function mapRowToListItem(row: PaymentRow): PaymentListItem {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientDocument: row.client_document,
    membershipId: row.membership_id,
    planName: row.plan_name,
    amount: row.amount,
    date: row.date,
    method: row.method,
    status: row.status,
    concept: row.concept,
  };
}

/** Usado internamente (ej. al crear una membresía) cuando los datos ya fueron validados. */
export async function registerPayment(gymId: string, input: CreatePaymentInput): Promise<string> {
  const id = crypto.randomUUID();
  await paymentRepository.createPayment(gymId, id, input);
  return id;
}

/** Usado desde el módulo de Pagos: valida un formulario crudo antes de registrar. */
export async function createPayment(gymId: string, input: PaymentFormInput): Promise<string> {
  const errors = validatePaymentForm(input);
  if (hasValidationErrors(errors)) throw new PaymentValidationError(errors);

  return registerPayment(gymId, {
    clientId: input.clientId,
    membershipId: input.membershipId,
    amount: input.amount ?? 0,
    date: input.date,
    method: input.method,
    status: "PAID",
    concept: input.concept.trim() || null,
  });
}

export async function getPayments(gymId: string): Promise<PaymentListItem[]> {
  const rows = await paymentRepository.listPayments(gymId);
  return rows.map(mapRowToListItem);
}

export async function updatePaymentConcept(
  gymId: string,
  id: string,
  input: PaymentEditInput,
): Promise<void> {
  const errors = validatePaymentEditForm(input);
  if (hasValidationErrors(errors)) throw new PaymentEditValidationError(errors);

  await paymentRepository.updatePaymentConcept(gymId, id, {
    method: input.method,
    concept: input.concept.trim() || null,
  });
}

export async function getMonthlyRevenue(gymId: string): Promise<number> {
  return paymentRepository.getMonthlyRevenue(gymId);
}
