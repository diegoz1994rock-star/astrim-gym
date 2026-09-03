import type { MeasurementListItem } from "@/types/measurement";

export interface MeasurementComparison {
  previousDate: string;
  currentDate: string;
  weightDelta: number | null;
  bmiDelta: number | null;
  waistDelta: number | null;
  chestDelta: number | null;
  armDelta: number | null;
  legDelta: number | null;
  calfDelta: number | null;
  hipDelta: number | null;
  bodyFatDelta: number | null;
  muscleMassDelta: number | null;
}

function delta(previous: number | null, current: number | null): number | null {
  if (previous === null || current === null) return null;
  return current - previous;
}

/**
 * Solo compara si existen dos mediciones reales; nunca inventa un "cambio"
 * cuando falta alguno de los dos valores.
 */
export function compareMeasurements(
  previous: MeasurementListItem | null,
  current: MeasurementListItem | null,
): MeasurementComparison | null {
  if (!previous || !current) return null;

  return {
    previousDate: previous.date,
    currentDate: current.date,
    weightDelta: delta(previous.weight, current.weight),
    bmiDelta: delta(previous.bmi, current.bmi),
    waistDelta: delta(previous.waist, current.waist),
    chestDelta: delta(previous.chest, current.chest),
    armDelta: delta(previous.arm, current.arm),
    legDelta: delta(previous.leg, current.leg),
    calfDelta: delta(previous.calf, current.calf),
    hipDelta: delta(previous.hip, current.hip),
    bodyFatDelta: delta(previous.bodyFat, current.bodyFat),
    muscleMassDelta: delta(previous.muscleMass, current.muscleMass),
  };
}
