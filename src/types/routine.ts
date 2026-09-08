import type { RoutineStatus } from "./db";

export type { RoutineStatus };

export interface RoutineFormInput {
  name: string;
  description: string;
  notes: string;
  status: RoutineStatus;
}

/**
 * Formulario para asignar una rutina (ya creada) a uno o varios clientes a
 * la vez, todos con la misma vigencia. Es un alta en lote: no reemplaza
 * asignaciones existentes, solo agrega las nuevas — ver AssignRoutineModal.
 */
export interface AssignRoutineFormInput {
  clientIds: string[];
  startDate: string | null;
  endDate: string | null;
}

export function emptyAssignRoutineForm(): AssignRoutineFormInput {
  return {
    clientIds: [],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
  };
}

export interface RoutineListItem {
  id: string;
  name: string;
  description: string | null;
  status: RoutineStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  exerciseCount: number;
  assignmentCount: number;
}

/** Un cliente asignado a una rutina, con su propia vigencia. */
export interface RoutineAssignmentListItem {
  id: string;
  routineId: string;
  clientId: string;
  clientName: string;
  clientDocument: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

/** Rutina vista desde un cliente en particular (su propia vigencia), usada en Progreso. */
export interface ClientRoutineListItem {
  id: string;
  name: string;
  description: string | null;
  status: RoutineStatus;
  notes: string | null;
  exerciseCount: number;
  startDate: string | null;
  endDate: string | null;
}

export interface RoutineFilters {
  search: string;
  status: "ALL" | RoutineStatus;
}

export const DEFAULT_ROUTINE_FILTERS: RoutineFilters = {
  search: "",
  status: "ALL",
};

export const ROUTINE_STATUS_LABELS: Record<RoutineStatus, string> = {
  ACTIVE: "Activa",
  FINISHED: "Finalizada",
  INACTIVE: "Inactiva",
};

// ---- Catálogo de rutinas predefinidas ----
// Rutina (estructura/distribución) y Objetivo (finalidad) son conceptos
// independientes: el catálogo de objetivos NUNCA se deriva del nombre de
// rutina elegido. Ambos se guardan como texto plano en routines.name /
// routines.description (sin migración: esas columnas ya eran TEXT libre),
// así que rutinas antiguas con valores fuera de este catálogo siguen
// siendo válidas para lectura — ver routineValidation.ts.

export interface RoutineNameGroup {
  label: string;
  options: string[];
}

// Únicamente dos categorías, a propósito: "Por objetivo" y "Por nivel" NO
// pertenecen a este selector (el objetivo es un campo independiente, ver
// ROUTINE_OBJECTIVE_OPTIONS; el nivel no se agrega en absoluto). Cada
// bloque de comentario indica de qué subsección del catálogo provienen
// las opciones, aunque <optgroup> nativo no admite anidar subgrupos.
export const ROUTINE_NAME_GROUPS: RoutineNameGroup[] = [
  {
    label: "Por distribución",
    options: [
      // Distribuciones generales
      "Full Body",
      "Upper / Lower",
      "Push / Pull / Legs (PPL)",
      "Bro Split",
      "Torso / Pierna",
      "Tren Superior / Tren Inferior",
      "Empuje / Tirón",
      "Empuje / Tirón / Piernas",
      "Pecho / Espalda / Piernas",
      "Pecho / Espalda / Hombros / Piernas",
      // Distribuciones combinadas
      "Pecho + Espalda",
      "Pecho + Hombros",
      "Espalda + Hombros",
      "Pecho + Tríceps",
      "Espalda + Bíceps",
      "Hombros + Brazos",
      "Piernas + Abdomen",
      "Glúteos + Abdomen",
      "Brazos + Abdomen",
      // Distribuciones completas
      "Piernas completas",
      "Tren superior completo",
      "Tren inferior completo",
      "Cuerpo completo + Cardio",
      "Fuerza de cuerpo completo",
      "Circuito de cuerpo completo",
    ],
  },
  {
    label: "Por grupo muscular",
    options: [
      // Pecho
      "Pecho completo",
      "Pecho superior",
      "Pecho medio",
      "Pecho inferior",
      "Pecho + Tríceps",
      "Pecho + Hombros",
      "Pecho + Espalda",
      // Espalda
      "Espalda completa",
      "Espalda alta",
      "Espalda media",
      "Dorsales",
      "Espalda + Bíceps",
      "Espalda + Hombros",
      // Hombros
      "Hombros completos",
      "Deltoide anterior",
      "Deltoide lateral",
      "Deltoide posterior",
      "Hombros + Trapecio",
      "Hombros + Brazos",
      // Brazos
      "Brazos completos",
      "Bíceps",
      "Tríceps",
      "Bíceps + Tríceps",
      "Bíceps + Antebrazo",
      "Tríceps + Hombros",
      "Brazos + Abdomen",
      // Piernas
      "Pierna completa",
      "Cuádriceps",
      "Femoral",
      "Glúteos",
      "Glúteos + Femoral",
      "Cuádriceps + Glúteos",
      "Femoral + Glúteos",
      "Pantorrillas",
      "Cuádriceps + Femoral",
      "Piernas + Abdomen",
      // Core / Abdomen
      "Abdomen",
      "Core completo",
      "Abdomen + Oblicuos",
      "Oblicuos",
      "Abdomen + Lumbar",
      "Core + Lumbar",
      // Combinadas (solo la que no aparece ya en una sección anterior)
      "Glúteos + Abdomen",
    ],
  },
];

export const ROUTINE_NAME_OPTIONS: string[] = ROUTINE_NAME_GROUPS.flatMap((group) => group.options);

export const ROUTINE_OBJECTIVE_OPTIONS: string[] = [
  "Ganancia de masa muscular",
  "Fuerza",
  "Resistencia",
  "Pérdida de grasa",
  "Acondicionamiento físico",
  "Movilidad",
  "Flexibilidad",
  "Salud general",
  "Rendimiento deportivo",
];

export function emptyRoutineForm(): RoutineFormInput {
  return {
    name: "",
    description: "",
    notes: "",
    status: "ACTIVE",
  };
}

export function routineToFormInput(routine: RoutineListItem): RoutineFormInput {
  return {
    name: routine.name,
    description: routine.description ?? "",
    notes: routine.notes ?? "",
    status: routine.status,
  };
}


// ---- Ejercicios dentro de una rutina ----
// Estructura mínima preparada para el futuro módulo de Ejercicios:
// hoy solo permite elegir entre los ejercicios ya existentes en la
// biblioteca (globales o del gimnasio), sin administrar esa biblioteca.

// ---- Configuración dinámica: fuerza vs. cardio por tiempo ----
// Un ejercicio de fuerza (Press banca, Sentadilla...) usa series/reps/peso/
// descanso. Uno de cardio (Caminata, Pedaleo, Remo...) usa tiempo +
// intensidad específica del equipamiento (velocidad/inclinación en
// caminadora, resistencia/rpm en bicicleta, etc.). El modo se deriva de los
// metadatos del ejercicio (exercise_type/equipment), nunca de su nombre —
// ver src/lib/domain/exerciseConfigMode.ts, que es la fuente de verdad.

export {
  TIME_UNIT_LABELS,
  INTENSITY_LABEL_OPTIONS,
  type TimeUnit,
  type ExerciseConfigInput,
} from "./exerciseConfig";

import { EMPTY_EXERCISE_CONFIG, type ExerciseConfigInput, type TimeUnit } from "./exerciseConfig";

export interface RoutineExerciseFormInput extends ExerciseConfigInput {
  exerciseId: string;
}

export interface RoutineExerciseListItem {
  id: string;
  routineId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string | null;
  equipment: string | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  restSeconds: number | null;
  notes: string | null;
  timeValue: number | null;
  timeUnit: TimeUnit | null;
  speedKmh: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  rpm: number | null;
  intensityLabel: string | null;
  sortOrder: number;
}

export function emptyRoutineExerciseForm(): RoutineExerciseFormInput {
  return { ...EMPTY_EXERCISE_CONFIG, exerciseId: "" };
}

export function routineExerciseToFormInput(item: RoutineExerciseListItem): RoutineExerciseFormInput {
  return {
    exerciseId: item.exerciseId,
    sets: item.sets,
    reps: item.reps,
    weight: item.weight,
    restSeconds: item.restSeconds,
    timeValue: item.timeValue,
    timeUnit: item.timeUnit,
    speedKmh: item.speedKmh,
    inclinePercent: item.inclinePercent,
    resistanceLevel: item.resistanceLevel,
    rpm: item.rpm,
    intensityLabel: item.intensityLabel,
    notes: item.notes ?? "",
  };
}
