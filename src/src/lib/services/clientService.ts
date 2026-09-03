import * as clientRepository from "../repositories/clientRepository";
import { computeAge } from "../domain/age";
import { computeMembershipStatus } from "../domain/membershipStatus";
import { generateAttendanceCode } from "../domain/attendanceCode";
import { validateClientForm, hasValidationErrors } from "../domain/clientValidation";
import type { ClientValidationErrors } from "../domain/clientValidation";
import type { ClientFormInput, ClientListItem } from "@/types/client";
import type { ClientRow } from "@/types/db";

export class ClientValidationError extends Error {
  constructor(public errors: ClientValidationErrors) {
    super("Los datos del cliente no son válidos.");
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("El cliente no existe en este gimnasio.");
  }
}

export class AttendanceCodeGenerationError extends Error {
  constructor() {
    super("No se pudo generar un código único. Intenta de nuevo.");
  }
}

function mapRowToListItem(row: ClientRow): ClientListItem {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    phone: row.phone,
    email: row.email,
    address: row.address,
    birthDate: row.birth_date,
    age: computeAge(row.birth_date),
    weight: row.weight,
    height: row.height,
    waist: row.waist,
    chest: row.chest,
    arm: row.arm,
    leg: row.leg,
    calf: row.calf,
    hip: row.hip,
    bodyFat: row.body_fat,
    muscleMass: row.muscle_mass,
    gender: row.gender,
    goal: row.goal,
    trainerId: row.trainer_id,
    trainerName: row.trainer_name,
    joinDate: row.join_date,
    photoPath: row.photo_path,
    observations: row.observations,
    status: row.status,
    attendanceCode: row.attendance_code,
    membershipId: row.membership_id,
    membershipPlanName: row.membership_plan_name,
    membershipStartDate: row.membership_start_date,
    membershipEndDate: row.membership_end_date,
    membershipPrice: row.membership_price,
    membershipStatus: row.membership_end_date
      ? computeMembershipStatus({
          endDate: row.membership_end_date,
          manualStatus: row.membership_manual_status,
        })
      : null,
  };
}

export async function getClients(gymId: string): Promise<ClientListItem[]> {
  const rows = await clientRepository.listClients(gymId);
  return rows.map(mapRowToListItem);
}

export async function getClientById(gymId: string, id: string): Promise<ClientListItem | null> {
  const row = await clientRepository.findClientById(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

async function assertUniqueDocument(
  gymId: string,
  document: string,
  excludeId?: string,
): Promise<ClientValidationErrors> {
  const existing = await clientRepository.findClientByDocument(gymId, document.trim(), excludeId);
  if (existing) {
    return { document: "Ya existe un cliente con este documento en el gimnasio." };
  }
  return {};
}

/**
 * Misma regla de unicidad que el documento, pero para attendance_code: un
 * código de asistencia no puede estar asignado a dos clientes del mismo
 * gimnasio a la vez (sí puede repetirse entre gimnasios distintos).
 */
async function assertUniqueAttendanceCode(
  gymId: string,
  attendanceCode: string,
  excludeId?: string,
): Promise<ClientValidationErrors> {
  const existing = await clientRepository.findClientByAttendanceCode(gymId, attendanceCode);
  if (existing && existing.id !== excludeId) {
    return { attendanceCode: "Este código de asistencia ya está asignado a otro cliente." };
  }
  return {};
}

export async function createClient(gymId: string, input: ClientFormInput): Promise<string> {
  const errors = validateClientForm(input);
  if (!errors.document) {
    Object.assign(errors, await assertUniqueDocument(gymId, input.document));
  }
  if (!errors.attendanceCode && input.attendanceCode) {
    Object.assign(errors, await assertUniqueAttendanceCode(gymId, input.attendanceCode));
  }
  if (hasValidationErrors(errors)) throw new ClientValidationError(errors);

  const id = crypto.randomUUID();
  await clientRepository.createClient(gymId, id, input);
  return id;
}

export async function updateClient(
  gymId: string,
  id: string,
  input: ClientFormInput,
): Promise<void> {
  const errors = validateClientForm(input);
  if (!errors.document) {
    Object.assign(errors, await assertUniqueDocument(gymId, input.document, id));
  }
  if (!errors.attendanceCode && input.attendanceCode) {
    Object.assign(errors, await assertUniqueAttendanceCode(gymId, input.attendanceCode, id));
  }
  if (hasValidationErrors(errors)) throw new ClientValidationError(errors);

  await clientRepository.updateClient(gymId, id, input);
}

export async function setClientStatus(
  gymId: string,
  id: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<void> {
  await clientRepository.setClientStatus(gymId, id, status);
}

const ATTENDANCE_CODE_MAX_ATTEMPTS = 10;

/**
 * Genera un código de 6 dígitos disponible en el gimnasio, sin persistirlo
 * todavía. excludeClientId permite regenerar el código de un cliente que
 * ya existe sin que su propio código actual cuente como "ocupado".
 */
async function generateUniqueAttendanceCode(gymId: string, excludeClientId?: string): Promise<string> {
  for (let attempt = 0; attempt < ATTENDANCE_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = generateAttendanceCode();
    const existing = await clientRepository.findClientByAttendanceCode(gymId, code);
    if (!existing || existing.id === excludeClientId) {
      return code;
    }
  }
  throw new AttendanceCodeGenerationError();
}

/**
 * Sugiere un código disponible para el botón "Generar" del formulario de
 * crear/editar cliente. No lo guarda: el código solo queda asignado si el
 * administrador guarda el formulario, igual que cualquier otro campo.
 */
export async function suggestAttendanceCode(gymId: string, excludeClientId?: string): Promise<string> {
  return generateUniqueAttendanceCode(gymId, excludeClientId);
}

/**
 * Genera y guarda de inmediato un nuevo código para un cliente ya
 * existente (usado por la tarjeta "Código de asistencia" del perfil).
 */
export async function generateClientAttendanceCode(gymId: string, clientId: string): Promise<string> {
  const client = await clientRepository.findClientById(gymId, clientId);
  if (!client) throw new ClientNotFoundError();

  const code = await generateUniqueAttendanceCode(gymId, clientId);
  await clientRepository.setClientAttendanceCode(gymId, clientId, code);
  return code;
}
