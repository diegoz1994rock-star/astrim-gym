import type { MembershipStatus } from "@/lib/domain/membershipStatus";
import type { MembershipManualStatus, PaymentMethod, PaymentStatus } from "./db";

export type { MembershipManualStatus, PaymentMethod, PaymentStatus };

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

// ---- Planes ----

export interface MembershipPlanFormInput {
  name: string;
  durationDays: number | null;
  price: number | null;
  description: string;
  active: boolean;
}

export interface MembershipPlanListItem {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string | null;
  active: boolean;
  clientCount: number;
}

export function emptyPlanForm(): MembershipPlanFormInput {
  return { name: "", durationDays: null, price: null, description: "", active: true };
}

export function planToFormInput(plan: MembershipPlanListItem): MembershipPlanFormInput {
  return {
    name: plan.name,
    durationDays: plan.durationDays,
    price: plan.price,
    description: plan.description ?? "",
    active: plan.active,
  };
}

// ---- Membresías ----

export interface MembershipFormInput {
  clientId: string;
  planId: string;
  startDate: string;
  price: number | null;
  paymentStatus: PaymentStatus;
  method: PaymentMethod | null;
  notes: string;
  registerPayment: boolean;
  paymentAmount: number | null;
  paymentMethod: PaymentMethod;
  paymentDate: string;
}

export interface MembershipListItem {
  id: string;
  clientId: string;
  clientName: string;
  clientDocument: string | null;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  price: number;
  paymentStatus: PaymentStatus;
  method: PaymentMethod | null;
  manualStatus: MembershipManualStatus | null;
  notes: string | null;
  status: MembershipStatus;
}

export interface MembershipFilters {
  search: string;
  status: "ALL" | MembershipStatus;
  planId: "ALL" | string;
}

export const DEFAULT_MEMBERSHIP_FILTERS: MembershipFilters = {
  search: "",
  status: "ALL",
  planId: "ALL",
};

export interface MembershipEditInput {
  startDate: string;
  endDate: string;
  price: number | null;
  paymentStatus: PaymentStatus;
  method: PaymentMethod | null;
  notes: string;
  manualStatus: MembershipManualStatus | null;
}

export function membershipToEditInput(membership: MembershipListItem): MembershipEditInput {
  return {
    startDate: membership.startDate,
    endDate: membership.endDate,
    price: membership.price,
    paymentStatus: membership.paymentStatus,
    method: membership.method,
    notes: membership.notes ?? "",
    manualStatus: membership.manualStatus,
  };
}

export function emptyMembershipForm(defaults?: {
  clientId?: string;
  planId?: string;
  startDate?: string;
  price?: number;
}): MembershipFormInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clientId: defaults?.clientId ?? "",
    planId: defaults?.planId ?? "",
    startDate: defaults?.startDate ?? today,
    price: defaults?.price ?? null,
    paymentStatus: "PENDING",
    method: null,
    notes: "",
    registerPayment: true,
    paymentAmount: defaults?.price ?? null,
    paymentMethod: "CASH",
    paymentDate: defaults?.startDate ?? today,
  };
}
