import type { ExerciseLevel, ExerciseStatus } from "./db";

export type { ExerciseLevel, ExerciseStatus };

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "LEGS"
  | "QUADRICEPS"
  | "HAMSTRINGS"
  | "CALVES"
  | "GLUTES"
  | "ABS"
  | "OBLIQUES"
  | "TRAPS"
  | "CARDIO"
  | "FULL_BODY"
  | "OTHER";

export type ExerciseType =
  | "STRENGTH"
  | "HYPERTROPHY"
  | "ENDURANCE"
  | "CARDIO"
  | "MOBILITY"
  | "FLEXIBILITY"
  | "PLYOMETRIC"
  | "FUNCTIONAL"
  | "OTHER";

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  FOREARMS: "Antebrazos",
  LEGS: "Piernas",
  QUADRICEPS: "Cuádriceps",
  HAMSTRINGS: "Femorales",
  CALVES: "Pantorrillas",
  GLUTES: "Glúteos",
  ABS: "Abdomen",
  OBLIQUES: "Oblicuos",
  TRAPS: "Trapecio",
  CARDIO: "Cardio",
  FULL_BODY: "Cuerpo completo",
  OTHER: "Otro",
};

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  STRENGTH: "Fuerza",
  HYPERTROPHY: "Hipertrofia",
  ENDURANCE: "Resistencia",
  CARDIO: "Cardio",
  MOBILITY: "Movilidad",
  FLEXIBILITY: "Flexibilidad",
  PLYOMETRIC: "Pliometría",
  FUNCTIONAL: "Funcional",
  OTHER: "Otro",
};

export const EXERCISE_LEVEL_LABELS: Record<ExerciseLevel, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};

// Catálogo de categorías del catálogo de ejercicios (28, ver migración 0012).
// Es un campo de agrupación/navegación independiente de muscleGroup: una
// categoría (ej. "Cardio - Remo") puede abarcar varios grupos musculares
// implícitos, y sirve para la vista de acordeón de ExercisesPage.
export const EXERCISE_CATEGORY_OPTIONS: string[] = [
  "Pecho",
  "Espalda",
  "Bíceps",
  "Tríceps",
  "Hombros",
  "Cuádriceps",
  "Glúteos",
  "Femorales",
  "Pantorrillas",
  "Abdomen / Core",
  "Oblicuos",
  "Trapecio",
  "Antebrazos",
  "Cardio - Caminadora",
  "Cardio - Bicicleta",
  "Cardio - Escaladora",
  "Cardio - Remo",
  "Cuerdas / Battle Rope",
  "Balón medicinal",
  "Pliometría",
  "Movilidad y flexibilidad",
  "Kettlebell",
  "Bandas elásticas",
  "Peso corporal / Funcional",
  "Entrenamiento funcional",
  "Trineo / Sled",
  "Smith Machine",
  "Poleas / Cable Crossover",
];

export const EQUIPMENT_OPTIONS: string[] = [
  "Barra",
  "Mancuernas",
  "Máquina",
  "Polea",
  "Peso corporal",
  "Kettlebell",
  "Banda elástica",
  "Balón medicinal",
  "Battle Rope",
  "Caminadora",
  "Bicicleta",
  "Remo",
  "Escaladora",
  "Smith Machine",
  "Trineo",
  "Banco",
  "Caja pliométrica",
  "Otro",
];

export interface ExerciseFormInput {
  name: string;
  category: string | null;
  description: string;
  muscleGroup: MuscleGroup | null;
  secondaryMuscles: string;
  exerciseType: ExerciseType | null;
  equipment: string;
  level: ExerciseLevel | null;
  instructions: string;
  /** URL del video de demostración (YouTube, video directo, etc.). Opcional. */
  videoPath: string;
  status: ExerciseStatus;
}

export interface ExerciseListItem {
  id: string;
  isGlobal: boolean;
  name: string;
  category: string | null;
  description: string | null;
  muscleGroup: MuscleGroup | null;
  secondaryMuscles: string | null;
  exerciseType: ExerciseType | null;
  equipment: string | null;
  level: ExerciseLevel | null;
  instructions: string | null;
  /** URL del video de demostración. Misma fuente de verdad que consumirá la futura app móvil. */
  videoPath: string | null;
  status: ExerciseStatus;
}

export interface ExerciseFilters {
  search: string;
  category: "ALL" | string;
  muscleGroup: "ALL" | MuscleGroup;
  exerciseType: "ALL" | ExerciseType;
  equipment: "ALL" | string;
  status: "ALL" | ExerciseStatus;
}

export const DEFAULT_EXERCISE_FILTERS: ExerciseFilters = {
  search: "",
  category: "ALL",
  muscleGroup: "ALL",
  exerciseType: "ALL",
  equipment: "ALL",
  status: "ALL",
};

export function emptyExerciseForm(): ExerciseFormInput {
  return {
    name: "",
    category: null,
    description: "",
    muscleGroup: null,
    secondaryMuscles: "",
    exerciseType: null,
    equipment: "",
    level: null,
    instructions: "",
    videoPath: "",
    status: "ACTIVE",
  };
}

export function exerciseToFormInput(exercise: ExerciseListItem): ExerciseFormInput {
  return {
    name: exercise.name,
    category: exercise.category,
    description: exercise.description ?? "",
    muscleGroup: exercise.muscleGroup,
    secondaryMuscles: exercise.secondaryMuscles ?? "",
    exerciseType: exercise.exerciseType,
    equipment: exercise.equipment ?? "",
    level: exercise.level,
    instructions: exercise.instructions ?? "",
    videoPath: exercise.videoPath ?? "",
    status: exercise.status,
  };
}
