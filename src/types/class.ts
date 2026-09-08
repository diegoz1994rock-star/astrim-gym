import type { ClassStatus } from "./db";
import { EMPTY_EXERCISE_CONFIG, type ExerciseConfigInput, type TimeUnit } from "./exerciseConfig";

export type { ClassStatus };

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  PROGRAMADA: "Programada",
  ABIERTA: "Abierta",
  COMPLETA: "Completa",
  EN_CURSO: "En curso",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export type ClassBlockType =
  | "CALENTAMIENTO"
  | "MOVILIDAD"
  | "FUERZA"
  | "TECNICA"
  | "WOD"
  | "CARDIO"
  | "ENFRIAMIENTO"
  | "PERSONALIZADO";

export const CLASS_BLOCK_TYPE_LABELS: Record<ClassBlockType, string> = {
  CALENTAMIENTO: "Calentamiento",
  MOVILIDAD: "Movilidad",
  FUERZA: "Fuerza",
  TECNICA: "Técnica",
  WOD: "WOD",
  CARDIO: "Cardio",
  ENFRIAMIENTO: "Enfriamiento",
  PERSONALIZADO: "Personalizado",
};

export interface ClassTypeOption {
  id: string;
  name: string;
}

export interface ClassBlockExerciseFormInput extends ExerciseConfigInput {
  /** null hasta guardarse por primera vez; el editor lo usa para distinguir filas nuevas de existentes. */
  id: string | null;
  exerciseId: string;
}

export interface ClassBlockFormInput {
  id: string | null;
  name: string;
  blockType: ClassBlockType;
  exercises: ClassBlockExerciseFormInput[];
}

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

/** 0 = domingo ... 6 = sábado, igual que Date#getDay(). */
export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  weekdays: number[];
  until: string;
}

export interface ClassFormInput {
  name: string;
  classTypeId: string;
  trainerId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  description: string;
  notes: string;
  status: ClassStatus;
  clientIds: string[];
  blocks: ClassBlockFormInput[];
  repeat: RecurrenceInput | null;
}

export interface ClassBlockExerciseListItem {
  id: string;
  blockId: string;
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

export interface ClassBlockListItem {
  id: string;
  classId: string;
  name: string;
  blockType: ClassBlockType;
  sortOrder: number;
  exercises: ClassBlockExerciseListItem[];
}

export interface ClassEnrollmentListItem {
  id: string;
  classId: string;
  clientId: string;
  clientName: string;
  clientDocument: string | null;
}

export interface ClassListItem {
  id: string;
  gymId: string;
  name: string;
  classTypeId: string;
  classTypeName: string;
  trainerId: string | null;
  trainerName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: ClassStatus;
  description: string | null;
  notes: string | null;
  recurrenceGroupId: string | null;
  enrolledCount: number;
}

export interface ClassDetail extends ClassListItem {
  blocks: ClassBlockListItem[];
  enrollments: ClassEnrollmentListItem[];
}

export type CapacityStatus = "AVAILABLE" | "ALMOST_FULL" | "FULL";

export const CAPACITY_STATUS_LABELS: Record<CapacityStatus, string> = {
  AVAILABLE: "Disponible",
  ALMOST_FULL: "Casi lleno",
  FULL: "Completa",
};

export function emptyClassBlockExerciseForm(): ClassBlockExerciseFormInput {
  return { ...EMPTY_EXERCISE_CONFIG, id: null, exerciseId: "" };
}

export function emptyClassBlockForm(blockType: ClassBlockType = "PERSONALIZADO"): ClassBlockFormInput {
  return { id: null, name: CLASS_BLOCK_TYPE_LABELS[blockType], blockType, exercises: [] };
}

export function emptyClassForm(date?: string): ClassFormInput {
  return {
    name: "",
    classTypeId: "",
    trainerId: null,
    date: date ?? new Date().toISOString().slice(0, 10),
    startTime: "08:00",
    endTime: "09:00",
    capacity: 15,
    description: "",
    notes: "",
    status: "PROGRAMADA",
    clientIds: [],
    blocks: [],
    repeat: null,
  };
}

export function classToFormInput(item: ClassDetail): ClassFormInput {
  return {
    name: item.name,
    classTypeId: item.classTypeId,
    trainerId: item.trainerId,
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    capacity: item.capacity,
    description: item.description ?? "",
    notes: item.notes ?? "",
    status: item.status,
    clientIds: item.enrollments.map((e) => e.clientId),
    blocks: item.blocks.map((block) => ({
      id: block.id,
      name: block.name,
      blockType: block.blockType,
      exercises: block.exercises.map((ex) => ({
        id: ex.id,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        restSeconds: ex.restSeconds,
        timeValue: ex.timeValue,
        timeUnit: ex.timeUnit,
        speedKmh: ex.speedKmh,
        inclinePercent: ex.inclinePercent,
        resistanceLevel: ex.resistanceLevel,
        rpm: ex.rpm,
        intensityLabel: ex.intensityLabel,
        notes: ex.notes ?? "",
      })),
    })),
    repeat: null,
  };
}
