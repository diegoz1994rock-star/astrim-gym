export interface MeasurementFormInput {
  clientId: string;
  date: string;
  weight: number | null;
  height: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  /** Etiquetado como "Muslo" en la UI; reutiliza la columna existente "leg". */
  leg: number | null;
  calf: number | null;
  hip: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  notes: string;
}

export interface MeasurementListItem {
  id: string;
  clientId: string;
  date: string;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  leg: number | null;
  calf: number | null;
  hip: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  notes: string | null;
}

export interface ProgressSummary {
  measurementCount: number;
  currentWeight: number | null;
  initialWeight: number | null;
  weightDifference: number | null;
  currentBmi: number | null;
  firstMeasurementDate: string | null;
  lastMeasurementDate: string | null;
}

export function emptyMeasurementForm(clientId: string): MeasurementFormInput {
  return {
    clientId,
    date: new Date().toISOString().slice(0, 10),
    weight: null,
    height: null,
    waist: null,
    chest: null,
    arm: null,
    leg: null,
    calf: null,
    hip: null,
    bodyFat: null,
    muscleMass: null,
    notes: "",
  };
}
