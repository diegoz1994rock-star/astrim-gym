import type { PaymentMethod, PaymentStatus } from "./db";

export type { PaymentMethod, PaymentStatus };

export interface PaymentFormInput {
  clientId: string;
  membershipId: string | null;
  amount: number | null;
  date: string;
  method: PaymentMethod;
  concept: string;
}

export interface PaymentEditInput {
  method: PaymentMethod;
  concept: string;
}

export interface PaymentListItem {
  id: string;
  clientId: string;
  clientName: string;
  clientDocument: string | null;
  membershipId: string | null;
  planName: string | null;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  concept: string | null;
}

export interface PaymentFilters {
  search: string;
  method: "ALL" | PaymentMethod;
  status: "ALL" | PaymentStatus;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_PAYMENT_FILTERS: PaymentFilters = {
  search: "",
  method: "ALL",
  status: "ALL",
  dateFrom: "",
  dateTo: "",
};

export function emptyPaymentForm(defaults?: {
  clientId?: string;
  membershipId?: string | null;
  amount?: number;
  concept?: string;
}): PaymentFormInput {
  return {
    clientId: defaults?.clientId ?? "",
    membershipId: defaults?.membershipId ?? null,
    amount: defaults?.amount ?? null,
    date: new Date().toISOString().slice(0, 10),
    method: "CASH",
    concept: defaults?.concept ?? "",
  };
}

export function paymentToEditInput(payment: PaymentListItem): PaymentEditInput {
  return { method: payment.method, concept: payment.concept ?? "" };
}
