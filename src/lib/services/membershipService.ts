import * as membershipRepository from "../repositories/membershipRepository";
import * as planRepository from "../repositories/membershipPlanRepository";
import * as paymentRepository from "../repositories/paymentRepository";
import { computeMembershipStatus } from "../domain/membershipStatus";
import { calculateEndDate } from "../domain/membershipDates";
import {
  validateMembershipForm,
  validateMembershipEditForm,
  hasValidationErrors,
} from "../domain/membershipValidation";
import type {
  MembershipEditValidationErrors,
  MembershipValidationErrors,
} from "../domain/membershipValidation";
import type {
  MembershipEditInput,
  MembershipFormInput,
  MembershipListItem,
} from "@/types/membership";
import type { MembershipListRow } from "@/types/db";

export class MembershipValidationError extends Error {
  constructor(public errors: MembershipValidationErrors) {
    super("Los datos de la membresía no son válidos.");
  }
}

export class MembershipEditValidationError extends Error {
  constructor(public errors: MembershipEditValidationErrors) {
    super("Los datos de la membresía no son válidos.");
  }
}

export class PlanNotFoundError extends Error {
  constructor() {
    super("El plan seleccionado no existe en este gimnasio.");
  }
}

function mapRowToListItem(row: MembershipListRow): MembershipListItem {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientDocument: row.client_document,
    planId: row.plan_id,
    planName: row.plan_name,
    startDate: row.start_date,
    endDate: row.end_date,
    price: row.price,
    paymentStatus: row.payment_status,
    method: row.method,
    manualStatus: row.manual_status,
    notes: row.notes,
    status: computeMembershipStatus({ endDate: row.end_date, manualStatus: row.manual_status }),
  };
}

export async function getMemberships(gymId: string): Promise<MembershipListItem[]> {
  const rows = await membershipRepository.listMemberships(gymId);
  return rows.map(mapRowToListItem);
}

export async function getMembershipsByClient(
  gymId: string,
  clientId: string,
): Promise<MembershipListItem[]> {
  const rows = await membershipRepository.listMembershipsByClient(gymId, clientId);
  return rows.map(mapRowToListItem);
}

export async function getMembershipById(gymId: string, id: string): Promise<MembershipListItem | null> {
  const row = await membershipRepository.findMembershipById(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

/**
 * Crea la membresía y, si corresponde, registra el pago en la misma operación.
 * El precio y la duración del plan se "congelan" en el momento de la creación:
 * cambios futuros al plan nunca afectan membresías ya creadas.
 */
export async function createMembership(
  gymId: string,
  input: MembershipFormInput,
): Promise<string> {
  const errors = validateMembershipForm(input);
  if (hasValidationErrors(errors)) throw new MembershipValidationError(errors);

  const plan = await planRepository.findPlanById(gymId, input.planId);
  if (!plan) throw new PlanNotFoundError();

  const endDate = calculateEndDate(input.startDate, plan.duration_days);
  const price = input.price ?? plan.price;
  const paymentStatus = input.registerPayment ? "PAID" : "PENDING";

  const membershipId = crypto.randomUUID();
  await membershipRepository.createMembership(gymId, membershipId, {
    clientId: input.clientId,
    planId: input.planId,
    startDate: input.startDate,
    endDate,
    price,
    paymentStatus,
    method: input.registerPayment ? input.paymentMethod : null,
    notes: input.notes.trim() || null,
  });

  if (input.registerPayment) {
    const paymentId = crypto.randomUUID();
    await paymentRepository.createPayment(gymId, paymentId, {
      clientId: input.clientId,
      membershipId,
      amount: input.paymentAmount ?? price,
      date: input.paymentDate,
      method: input.paymentMethod,
      status: "PAID",
      concept: `Pago de membresía: ${plan.name}`,
    });
  }

  return membershipId;
}

export async function updateMembership(
  gymId: string,
  id: string,
  input: MembershipEditInput,
): Promise<void> {
  const errors = validateMembershipEditForm(input);
  if (hasValidationErrors(errors)) throw new MembershipEditValidationError(errors);

  await membershipRepository.updateMembership(gymId, id, {
    startDate: input.startDate,
    endDate: input.endDate,
    price: input.price ?? 0,
    paymentStatus: input.paymentStatus,
    method: input.method,
    notes: input.notes.trim() || null,
    manualStatus: input.manualStatus,
  });
}
