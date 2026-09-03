import * as planRepository from "../repositories/membershipPlanRepository";
import { validatePlanForm, hasValidationErrors } from "../domain/membershipPlanValidation";
import type { MembershipPlanValidationErrors } from "../domain/membershipPlanValidation";
import type { MembershipPlanFormInput, MembershipPlanListItem } from "@/types/membership";
import type { MembershipPlanRow } from "@/types/db";

export class PlanValidationError extends Error {
  constructor(public errors: MembershipPlanValidationErrors) {
    super("Los datos del plan no son válidos.");
  }
}

function mapRowToListItem(row: MembershipPlanRow): MembershipPlanListItem {
  return {
    id: row.id,
    name: row.name,
    durationDays: row.duration_days,
    price: row.price,
    description: row.description,
    active: row.active === 1,
    clientCount: row.client_count,
  };
}

export async function getPlans(gymId: string): Promise<MembershipPlanListItem[]> {
  const rows = await planRepository.listPlans(gymId);
  return rows.map(mapRowToListItem);
}

export async function getActivePlans(gymId: string): Promise<MembershipPlanListItem[]> {
  const rows = await planRepository.listActivePlans(gymId);
  return rows.map(mapRowToListItem);
}

export async function getPlanById(gymId: string, id: string): Promise<MembershipPlanListItem | null> {
  const row = await planRepository.findPlanById(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

async function assertUniqueName(
  gymId: string,
  name: string,
  excludeId?: string,
): Promise<MembershipPlanValidationErrors> {
  const existing = await planRepository.findPlanByName(gymId, name.trim(), excludeId);
  if (existing) {
    return { name: "Ya existe un plan con este nombre en el gimnasio." };
  }
  return {};
}

export async function createPlan(gymId: string, input: MembershipPlanFormInput): Promise<string> {
  const errors = validatePlanForm(input);
  if (!errors.name) {
    Object.assign(errors, await assertUniqueName(gymId, input.name));
  }
  if (hasValidationErrors(errors)) throw new PlanValidationError(errors);

  const id = crypto.randomUUID();
  await planRepository.createPlan(gymId, id, input);
  return id;
}

export async function updatePlan(
  gymId: string,
  id: string,
  input: MembershipPlanFormInput,
): Promise<void> {
  const errors = validatePlanForm(input);
  if (!errors.name) {
    Object.assign(errors, await assertUniqueName(gymId, input.name, id));
  }
  if (hasValidationErrors(errors)) throw new PlanValidationError(errors);

  await planRepository.updatePlan(gymId, id, input);
}

export async function setPlanActive(gymId: string, id: string, active: boolean): Promise<void> {
  await planRepository.setPlanActive(gymId, id, active);
}
