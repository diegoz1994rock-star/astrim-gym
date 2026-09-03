import * as measurementRepository from "../repositories/measurementRepository";
import * as clientRepository from "../repositories/clientRepository";
import { computeBmi } from "../domain/bmi";
import { validateMeasurementForm, hasValidationErrors } from "../domain/measurementValidation";
import type { MeasurementValidationErrors } from "../domain/measurementValidation";
import type {
  MeasurementFormInput,
  MeasurementListItem,
  ProgressSummary,
} from "@/types/measurement";
import type { MeasurementRow } from "@/types/db";

export class MeasurementValidationError extends Error {
  constructor(public errors: MeasurementValidationErrors) {
    super("Los datos de la medición no son válidos.");
  }
}

export class ClientNotInGymError extends Error {
  constructor() {
    super("El cliente seleccionado no pertenece a este gimnasio.");
  }
}

function mapRowToListItem(row: MeasurementRow): MeasurementListItem {
  return {
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    weight: row.weight,
    height: row.height,
    bmi: computeBmi(row.weight, row.height),
    waist: row.waist,
    chest: row.chest,
    arm: row.arm,
    leg: row.leg,
    calf: row.calf,
    hip: row.hip,
    bodyFat: row.body_fat,
    muscleMass: row.muscle_mass,
    notes: row.notes,
  };
}

/** Histórico completo del cliente, en orden cronológico (más antigua primero). */
export async function getMeasurementsByClient(
  gymId: string,
  clientId: string,
): Promise<MeasurementListItem[]> {
  const rows = await measurementRepository.listMeasurementsByClient(gymId, clientId);
  return rows.map(mapRowToListItem);
}

export async function createMeasurement(
  gymId: string,
  input: MeasurementFormInput,
): Promise<string> {
  const errors = validateMeasurementForm(input);
  if (hasValidationErrors(errors)) throw new MeasurementValidationError(errors);

  const client = await clientRepository.findClientById(gymId, input.clientId);
  if (!client) throw new ClientNotInGymError();

  const id = crypto.randomUUID();
  await measurementRepository.createMeasurement(gymId, id, input);
  return id;
}

/**
 * Nunca inventa valores: si no hay mediciones, measurementCount es 0 y el
 * resto de los campos queda en null para que la UI muestre
 * "Sin datos suficientes" en vez de un dato falso.
 */
export function buildProgressSummary(measurements: MeasurementListItem[]): ProgressSummary {
  if (measurements.length === 0) {
    return {
      measurementCount: 0,
      currentWeight: null,
      initialWeight: null,
      weightDifference: null,
      currentBmi: null,
      firstMeasurementDate: null,
      lastMeasurementDate: null,
    };
  }

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const weightDifference =
    first.weight !== null && last.weight !== null ? last.weight - first.weight : null;

  return {
    measurementCount: measurements.length,
    currentWeight: last.weight,
    initialWeight: first.weight,
    weightDifference,
    currentBmi: last.bmi,
    firstMeasurementDate: first.date,
    lastMeasurementDate: last.date,
  };
}
