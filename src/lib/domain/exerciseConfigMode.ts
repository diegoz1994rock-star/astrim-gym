import { TIME_UNIT_LABELS, type TimeUnit } from "@/types/routine";

/**
 * Modo de configuración de un ejercicio dentro de una rutina. Se deriva
 * siempre de los metadatos del ejercicio (exercise_type/equipment del
 * catálogo), nunca de su nombre — así el catálogo de Ejercicios sigue
 * siendo la única fuente de verdad y no hay lógica duplicada en Rutinas.
 */
export type ExerciseConfigurationMode = "STRENGTH" | "CARDIO_TIME" | "MOBILITY";

export function getExerciseConfigurationMode(exerciseType: string | null): ExerciseConfigurationMode {
  if (exerciseType === "CARDIO") return "CARDIO_TIME";
  if (exerciseType === "MOBILITY" || exerciseType === "FLEXIBILITY") return "MOBILITY";
  return "STRENGTH";
}

/** Perfil de intensidad dentro del modo CARDIO_TIME, según el equipamiento del catálogo. */
export type CardioEquipmentProfile = "TREADMILL" | "BIKE" | "ROWER" | "CLIMBER" | "GENERIC";

const CARDIO_EQUIPMENT_PROFILES: Record<string, CardioEquipmentProfile> = {
  Caminadora: "TREADMILL",
  Bicicleta: "BIKE",
  Remo: "ROWER",
  Escaladora: "CLIMBER",
};

export function getCardioEquipmentProfile(equipment: string | null): CardioEquipmentProfile {
  if (equipment && CARDIO_EQUIPMENT_PROFILES[equipment]) return CARDIO_EQUIPMENT_PROFILES[equipment];
  return "GENERIC";
}

interface LegacyStrengthFields {
  sets: number | null;
  reps: number | null;
  weight: number | null;
  restSeconds: number | null;
}

/**
 * Una rutina antigua nunca debería poder tener datos de fuerza en un
 * ejercicio que el catálogo ahora clasifica como cardio (el catálogo de
 * cardio no existía antes), pero si llegara a ocurrir no queremos ocultar
 * ni borrar esos valores: se conservan y se sigue mostrando/editando como
 * ejercicio de fuerza hasta que se guarde explícitamente en el nuevo modo.
 */
export function hasLegacyStrengthValues(fields: LegacyStrengthFields): boolean {
  return fields.sets !== null || fields.reps !== null || fields.weight !== null || fields.restSeconds !== null;
}

export function resolveEffectiveMode(
  hasLegacyData: boolean,
  catalogMode: ExerciseConfigurationMode,
): ExerciseConfigurationMode {
  return catalogMode !== "STRENGTH" && hasLegacyData ? "STRENGTH" : catalogMode;
}

interface RoutineExerciseSummaryInput extends LegacyStrengthFields {
  exerciseType: string | null;
  equipment: string | null;
  notes?: string | null;
  timeValue: number | null;
  timeUnit: TimeUnit | null;
  speedKmh: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  rpm: number | null;
  intensityLabel: string | null;
}

/** Resumen legible de la configuración de un ejercicio de rutina, usado en la tabla de detalle. */
export function formatRoutineExerciseSummary(input: RoutineExerciseSummaryInput): string {
  const catalogMode = getExerciseConfigurationMode(input.exerciseType);
  const mode = resolveEffectiveMode(hasLegacyStrengthValues(input), catalogMode);

  const parts: string[] = [];

  if (mode === "STRENGTH") {
    if (input.sets !== null) parts.push(`${input.sets} series`);
    if (input.reps !== null) parts.push(`${input.reps} reps`);
    if (input.weight !== null) parts.push(`${input.weight} kg`);
    if (input.restSeconds !== null) parts.push(`${input.restSeconds} s descanso`);
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  if (input.timeValue !== null && input.timeUnit) {
    parts.push(`${input.timeValue} ${TIME_UNIT_LABELS[input.timeUnit]}`);
  }

  if (mode === "CARDIO_TIME") {
    const profile = getCardioEquipmentProfile(input.equipment);
    if (profile === "TREADMILL") {
      if (input.speedKmh !== null) parts.push(`${input.speedKmh} km/h`);
      if (input.inclinePercent !== null) parts.push(`${input.inclinePercent}% inclinación`);
    } else if (profile === "BIKE" || profile === "ROWER" || profile === "CLIMBER") {
      if (input.resistanceLevel !== null) parts.push(`Nivel ${input.resistanceLevel}`);
      if (profile === "BIKE" && input.rpm !== null) parts.push(`${input.rpm} rpm`);
    } else if (input.intensityLabel) {
      parts.push(`Intensidad: ${input.intensityLabel}`);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}
