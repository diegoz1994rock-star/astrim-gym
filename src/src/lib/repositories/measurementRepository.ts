import { getDb } from "../db/client";
import type { MeasurementRow } from "@/types/db";
import type { MeasurementFormInput } from "@/types/measurement";

const MEASUREMENT_SELECT = `
  SELECT id, gym_id, client_id, date, weight, height, waist, chest, arm, leg,
         calf, hip, body_fat, muscle_mass, notes
  FROM measurements
`;

/** Orden cronológico ascendente: Progreso es una línea de tiempo, no un registro de actividad reciente. */
export async function listMeasurementsByClient(
  gymId: string,
  clientId: string,
): Promise<MeasurementRow[]> {
  const db = await getDb();
  return db.select<MeasurementRow[]>(
    `${MEASUREMENT_SELECT} WHERE gym_id = $1 AND client_id = $2 ORDER BY date ASC, created_at ASC`,
    [gymId, clientId],
  );
}

export async function createMeasurement(
  gymId: string,
  id: string,
  input: MeasurementFormInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO measurements (
       id, gym_id, client_id, date, weight, height, waist, chest, arm, leg,
       calf, hip, body_fat, muscle_mass, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id,
      gymId,
      input.clientId,
      input.date,
      input.weight,
      input.height,
      input.waist,
      input.chest,
      input.arm,
      input.leg,
      input.calf,
      input.hip,
      input.bodyFat,
      input.muscleMass,
      input.notes.trim() || null,
    ],
  );
}
