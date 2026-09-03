import * as attendanceRepository from "../repositories/attendanceRepository";
import * as clientRepository from "../repositories/clientRepository";
import {
  validateRegisterAttendanceInput,
  hasValidationErrors,
} from "../domain/attendanceValidation";
import type { AttendanceValidationErrors } from "../domain/attendanceValidation";
import type {
  AttendanceListItem,
  AttendanceMethod,
  AttendeeRanking,
  AttendanceSummary,
  RegisterAttendanceInput,
} from "@/types/attendance";
import type { AttendanceRow } from "@/types/db";

export class AttendanceValidationError extends Error {
  constructor(public errors: AttendanceValidationErrors) {
    super("Los datos de la asistencia no son válidos.");
  }
}

export class ClientNotInGymError extends Error {
  constructor() {
    super("El cliente seleccionado no pertenece a este gimnasio.");
  }
}

export class AttendanceAlreadyOpenError extends Error {
  constructor() {
    super("Este cliente ya tiene una entrada registrada hoy sin salida.");
  }
}

export class AttendanceNotFoundError extends Error {
  constructor() {
    super("La asistencia no existe en este gimnasio.");
  }
}

function mapRowToListItem(row: AttendanceRow): AttendanceListItem {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientDocument: row.client_document,
    date: row.date,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
    membershipId: row.membership_id,
    planName: row.plan_name,
    notes: row.notes,
    entryMethod: row.entry_method as AttendanceMethod | null,
    exitMethod: row.exit_method as AttendanceMethod | null,
    isInside: row.check_in !== null && row.check_out === null,
  };
}

export async function getAttendance(gymId: string): Promise<AttendanceListItem[]> {
  const rows = await attendanceRepository.listAttendance(gymId);
  return rows.map(mapRowToListItem);
}

export async function getAttendanceById(gymId: string, id: string): Promise<AttendanceListItem | null> {
  const row = await attendanceRepository.findAttendanceById(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

/**
 * Reglas aplicadas, en orden:
 * 1. El cliente debe existir y pertenecer a este gimnasio (findClientById
 *    ya filtra por gym_id: si no pertenece, devuelve null igual que si no
 *    existiera — impide asociar clientes de otro gimnasio).
 * 2. No se permite una segunda entrada abierta el mismo día para el mismo
 *    cliente (evita duplicados accidentales); si ya tiene una salida
 *    registrada hoy, sí puede volver a entrar.
 * 3. El estado de membresía NUNCA bloquea el registro: el proyecto no
 *    define esa regla en ningún otro módulo (Membresías solo muestra
 *    advertencias informativas, nunca bloquea), así que aquí tampoco se
 *    inventa un bloqueo nuevo. El membership_id vigente (si existe) se
 *    guarda como referencia informativa en el registro.
 */
export async function registerAttendance(
  gymId: string,
  input: RegisterAttendanceInput,
): Promise<string> {
  const errors = validateRegisterAttendanceInput(input);
  if (hasValidationErrors(errors)) throw new AttendanceValidationError(errors);

  const client = await clientRepository.findClientById(gymId, input.clientId);
  if (!client) throw new ClientNotInGymError();

  const openAttendance = await attendanceRepository.findOpenAttendanceForClientToday(
    gymId,
    input.clientId,
  );
  if (openAttendance) throw new AttendanceAlreadyOpenError();

  const id = crypto.randomUUID();
  await attendanceRepository.createAttendance(gymId, id, {
    clientId: input.clientId,
    membershipId: client.membership_id,
    notes: input.notes.trim() || null,
    entryMethod: "MANUAL",
    deviceId: null,
  });
  return id;
}

export async function registerCheckOut(gymId: string, attendanceId: string): Promise<void> {
  const attendance = await attendanceRepository.findAttendanceById(gymId, attendanceId);
  if (!attendance) throw new AttendanceNotFoundError();

  await attendanceRepository.checkOutAttendance(gymId, attendanceId, "MANUAL");
}

export async function getAttendanceSummary(gymId: string): Promise<AttendanceSummary> {
  const [stats, topRows] = await Promise.all([
    attendanceRepository.getStats(gymId),
    attendanceRepository.getTopAttendeesThisMonth(gymId, 5),
  ]);

  const dayOfMonth = new Date().getDate();
  const averagePerDayThisMonth = dayOfMonth > 0 ? stats.this_month / dayOfMonth : 0;

  const topAttendees: AttendeeRanking[] = topRows.map((row) => ({
    clientId: row.client_id,
    clientName: row.client_name,
    visits: row.visits,
  }));

  return {
    today: stats.today,
    insideNow: stats.inside_now,
    thisMonth: stats.this_month,
    averagePerDayThisMonth,
    topAttendees,
  };
}
