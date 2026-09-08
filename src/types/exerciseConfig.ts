export type TimeUnit = "MINUTES" | "HOURS";

export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  MINUTES: "minutos",
  HOURS: "horas",
};

export const INTENSITY_LABEL_OPTIONS: string[] = ["Baja", "Moderada", "Alta", "Muy alta"];

/**
 * Configuración de un ejercicio, compartida por Rutinas y por Clases/Sesiones
 * para que ambos se comporten igual: un ejercicio de fuerza usa
 * series/reps/peso/descanso; uno de cardio usa tiempo + intensidad del
 * equipamiento. El modo se deriva SIEMPRE del ejercicio del catálogo
 * (exercise_type / equipment) — ver src/lib/domain/exerciseConfigMode.ts.
 */
export interface ExerciseConfigInput {
  // Fuerza / musculación
  sets: number | null;
  reps: number | null;
  weight: number | null;
  restSeconds: number | null;
  // Cardio / tiempo
  timeValue: number | null;
  timeUnit: TimeUnit | null;
  speedKmh: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  rpm: number | null;
  intensityLabel: string | null;
  // Común a ambos modos
  notes: string;
}

export const EMPTY_EXERCISE_CONFIG: ExerciseConfigInput = {
  sets: null,
  reps: null,
  weight: null,
  restSeconds: null,
  timeValue: null,
  timeUnit: null,
  speedKmh: null,
  inclinePercent: null,
  resistanceLevel: null,
  rpm: null,
  intensityLabel: null,
  notes: "",
};

export type ExerciseConfigErrors = Partial<Record<keyof ExerciseConfigInput, string>>;
