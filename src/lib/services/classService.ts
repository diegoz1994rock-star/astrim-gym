import * as classRepository from "../repositories/classRepository";
import { validateClassForm, hasValidationErrors } from "../domain/classValidation";
import type { ClassValidationErrors } from "../domain/classValidation";
import { generateRecurrenceDates } from "../domain/classRecurrence";
import type {
  ClassBlockListItem,
  ClassDetail,
  ClassEnrollmentListItem,
  ClassFormInput,
  ClassListItem,
  ClassTypeOption,
} from "@/types/class";
import type { ClassBlockExerciseRow, ClassBlockRow, ClassEnrollmentRow, ClassRow } from "@/types/db";

export class ClassValidationError extends Error {
  constructor(public errors: ClassValidationErrors) {
    super("Los datos de la clase no son válidos.");
  }
}

export class ClassNotFoundError extends Error {
  constructor() {
    super("La clase no existe en este gimnasio.");
  }
}

function mapRowToListItem(row: ClassRow): ClassListItem {
  return {
    id: row.id,
    gymId: row.gym_id,
    name: row.name,
    classTypeId: row.class_type_id,
    classTypeName: row.class_type_name,
    trainerId: row.trainer_id,
    trainerName: row.trainer_name,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    capacity: row.capacity,
    status: row.status,
    description: row.description,
    notes: row.notes,
    recurrenceGroupId: row.recurrence_group_id,
    enrolledCount: row.enrolled_count,
  };
}

function mapBlocks(blockRows: ClassBlockRow[], exerciseRows: ClassBlockExerciseRow[]): ClassBlockListItem[] {
  return blockRows.map((block) => ({
    id: block.id,
    classId: block.class_id,
    name: block.name,
    blockType: block.block_type as ClassBlockListItem["blockType"],
    sortOrder: block.sort_order,
    exercises: exerciseRows
      .filter((ex) => ex.block_id === block.id)
      .map((ex) => ({
        id: ex.id,
        blockId: ex.block_id,
        exerciseId: ex.exercise_id,
        exerciseName: ex.exercise_name,
        exerciseType: ex.exercise_type,
        equipment: ex.equipment,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        restSeconds: ex.rest_seconds,
        notes: ex.notes,
        timeValue: ex.time_value,
        timeUnit: ex.time_unit as ClassBlockListItem["exercises"][number]["timeUnit"],
        speedKmh: ex.speed_kmh,
        inclinePercent: ex.incline_percent,
        resistanceLevel: ex.resistance_level,
        rpm: ex.rpm,
        intensityLabel: ex.intensity_label,
        sortOrder: ex.sort_order,
      })),
  }));
}

function mapEnrollment(row: ClassEnrollmentRow): ClassEnrollmentListItem {
  return {
    id: row.id,
    classId: row.class_id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientDocument: row.client_document,
  };
}

export async function getClassTypeOptions(gymId: string): Promise<ClassTypeOption[]> {
  const rows = await classRepository.listClassTypes(gymId);
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

export async function getClassesByDateRange(gymId: string, from: string, to: string): Promise<ClassListItem[]> {
  const rows = await classRepository.listClassesByDateRange(gymId, from, to);
  return rows.map(mapRowToListItem);
}

export async function getClassDetail(gymId: string, classId: string): Promise<ClassDetail | null> {
  const row = await classRepository.findClassById(gymId, classId);
  if (!row) return null;

  const [blockRows, exerciseRows, enrollmentRows] = await Promise.all([
    classRepository.listBlocks(classId),
    classRepository.listBlockExercisesForClass(classId),
    classRepository.listEnrollments(classId),
  ]);

  return {
    ...mapRowToListItem(row),
    blocks: mapBlocks(blockRows, exerciseRows),
    enrollments: enrollmentRows.map(mapEnrollment),
  };
}

async function persistClassContent(classId: string, input: ClassFormInput): Promise<void> {
  await classRepository.replaceClassBlocks(classId, input.blocks);
  await classRepository.replaceClassRoster(classId, input.clientIds);
}

/**
 * Sin recurrencia: crea una sola clase. Con recurrencia: genera una fila
 * independiente por cada fecha de la serie (misma configuración, cupo e
 * inscripciones iniciales, pero cada una editable después sin afectar a
 * las demás), compartiendo un recurrence_group_id.
 */
export async function createClass(gymId: string, input: ClassFormInput): Promise<string[]> {
  const errors = validateClassForm(input);
  if (hasValidationErrors(errors)) throw new ClassValidationError(errors);

  const header = {
    classTypeId: input.classTypeId,
    trainerId: input.trainerId,
    name: input.name,
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity,
    status: input.status,
    description: input.description,
    notes: input.notes,
  };

  if (!input.repeat) {
    const id = crypto.randomUUID();
    await classRepository.createClass(gymId, id, { ...header, date: input.date, recurrenceGroupId: null });
    await persistClassContent(id, input);
    return [id];
  }

  const dates = generateRecurrenceDates(input.date, input.repeat);
  const recurrenceGroupId = crypto.randomUUID();
  const ids: string[] = [];
  for (const date of dates) {
    const id = crypto.randomUUID();
    await classRepository.createClass(gymId, id, { ...header, date, recurrenceGroupId });
    await persistClassContent(id, input);
    ids.push(id);
  }
  return ids;
}

/** Edita únicamente esta ocurrencia — nunca propaga cambios a otras sesiones de la misma serie. */
export async function updateClass(gymId: string, classId: string, input: ClassFormInput): Promise<void> {
  const existing = await classRepository.findClassById(gymId, classId);
  if (!existing) throw new ClassNotFoundError();

  const errors = validateClassForm(input);
  if (hasValidationErrors(errors)) throw new ClassValidationError(errors);

  await classRepository.updateClass(gymId, classId, {
    classTypeId: input.classTypeId,
    trainerId: input.trainerId,
    name: input.name,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity,
    status: input.status,
    description: input.description,
    notes: input.notes,
    recurrenceGroupId: existing.recurrence_group_id,
  });
  await persistClassContent(classId, input);
}

/** Nunca borra físicamente una clase: cancelarla preserva el historial (inscripciones incluidas). */
export async function cancelClass(gymId: string, classId: string): Promise<void> {
  const existing = await classRepository.findClassById(gymId, classId);
  if (!existing) throw new ClassNotFoundError();
  await classRepository.setClassStatus(gymId, classId, "CANCELADA");
}
