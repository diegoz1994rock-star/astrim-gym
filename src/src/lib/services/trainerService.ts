import * as trainerRepository from "../repositories/trainerRepository";
import { computeAge } from "../domain/age";
import { validateTrainerForm, hasValidationErrors } from "../domain/trainerValidation";
import type { TrainerValidationErrors } from "../domain/trainerValidation";
import type { TrainerFormInput, TrainerListItem } from "@/types/trainer";
import type { TrainerOptionRow, TrainerRow, TrainerStatus } from "@/types/db";

export class TrainerValidationError extends Error {
  constructor(public errors: TrainerValidationErrors) {
    super("Los datos del entrenador no son válidos.");
  }
}

function mapRowToListItem(row: TrainerRow): TrainerListItem {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    birthDate: row.birth_date,
    age: computeAge(row.birth_date),
    phone: row.phone,
    email: row.email,
    address: row.address,
    specialty: row.specialty,
    description: row.description,
    photoPath: row.photo_path,
    joinDate: row.join_date,
    observations: row.observations,
    status: row.status,
    clientCount: row.client_count,
  };
}

export async function getActiveTrainerOptions(gymId: string): Promise<TrainerOptionRow[]> {
  return trainerRepository.listActiveTrainers(gymId);
}

export async function getTrainers(gymId: string): Promise<TrainerListItem[]> {
  const rows = await trainerRepository.listTrainers(gymId);
  return rows.map(mapRowToListItem);
}

export async function getTrainerById(gymId: string, id: string): Promise<TrainerListItem | null> {
  const row = await trainerRepository.findTrainerById(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

async function assertUniqueDocument(
  gymId: string,
  document: string,
  excludeId?: string,
): Promise<TrainerValidationErrors> {
  const existing = await trainerRepository.findTrainerByDocument(gymId, document.trim(), excludeId);
  if (existing) {
    return { document: "Ya existe un entrenador con este documento en el gimnasio." };
  }
  return {};
}

export async function createTrainer(gymId: string, input: TrainerFormInput): Promise<string> {
  const errors = validateTrainerForm(input);
  if (!errors.document) {
    Object.assign(errors, await assertUniqueDocument(gymId, input.document));
  }
  if (hasValidationErrors(errors)) throw new TrainerValidationError(errors);

  const id = crypto.randomUUID();
  await trainerRepository.createTrainer(gymId, id, input);
  return id;
}

export async function updateTrainer(
  gymId: string,
  id: string,
  input: TrainerFormInput,
): Promise<void> {
  const errors = validateTrainerForm(input);
  if (!errors.document) {
    Object.assign(errors, await assertUniqueDocument(gymId, input.document, id));
  }
  if (hasValidationErrors(errors)) throw new TrainerValidationError(errors);

  await trainerRepository.updateTrainer(gymId, id, input);
}

export async function setTrainerStatus(
  gymId: string,
  id: string,
  status: TrainerStatus,
): Promise<void> {
  await trainerRepository.setTrainerStatus(gymId, id, status);
}
