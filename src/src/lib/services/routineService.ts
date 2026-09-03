import * as routineRepository from "../repositories/routineRepository";
import * as clientRepository from "../repositories/clientRepository";
import * as exerciseRepository from "../repositories/exerciseRepository";
import {
  validateRoutineForm,
  validateRoutineExerciseForm,
  hasValidationErrors,
} from "../domain/routineValidation";
import type {
  RoutineExerciseValidationErrors,
  RoutineValidationErrors,
} from "../domain/routineValidation";
import { getCardioEquipmentProfile, getExerciseConfigurationMode } from "../domain/exerciseConfigMode";
import type {
  RoutineExerciseFormInput,
  RoutineExerciseListItem,
  RoutineFormInput,
  RoutineListItem,
  TimeUnit,
} from "@/types/routine";
import type { ExerciseOptionRow, RoutineExerciseRow, RoutineRow, RoutineStatus } from "@/types/db";
import type { RoutineExercisePersistedFields } from "../repositories/routineRepository";

export class RoutineValidationError extends Error {
  constructor(public errors: RoutineValidationErrors) {
    super("Los datos de la rutina no son válidos.");
  }
}

export class RoutineExerciseValidationError extends Error {
  constructor(public errors: RoutineExerciseValidationErrors) {
    super("Los datos del ejercicio no son válidos.");
  }
}

export class ClientNotInGymError extends Error {
  constructor() {
    super("El cliente seleccionado no pertenece a este gimnasio.");
  }
}

export class ExerciseNotAvailableError extends Error {
  constructor() {
    super("El ejercicio seleccionado no está disponible para este gimnasio.");
  }
}

export class RoutineNotFoundError extends Error {
  constructor() {
    super("La rutina no existe en este gimnasio.");
  }
}

function mapRowToListItem(row: RoutineRow): RoutineListItem {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientDocument: row.client_document,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exerciseCount: row.exercise_count,
  };
}

function mapExerciseRowToListItem(row: RoutineExerciseRow): RoutineExerciseListItem {
  return {
    id: row.id,
    routineId: row.routine_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    exerciseType: row.exercise_type,
    equipment: row.equipment,
    sets: row.sets,
    reps: row.reps,
    weight: row.weight,
    restSeconds: row.rest_seconds,
    notes: row.notes,
    timeValue: row.time_value,
    timeUnit: row.time_unit as TimeUnit | null,
    speedKmh: row.speed_kmh,
    inclinePercent: row.incline_percent,
    resistanceLevel: row.resistance_level,
    rpm: row.rpm,
    intensityLabel: row.intensity_label,
    sortOrder: row.sort_order,
  };
}

/**
 * El cliente NUNCA se valida solo por su ID: siempre se busca con
 * clientRepository.findClientById(gymId, id), que ya filtra por gym_id.
 * Si el cliente pertenece a otro gimnasio, esta búsqueda devuelve null,
 * exactamente igual que si no existiera — así se impide la asociación
 * cruzada entre gimnasios.
 */
async function assertClientBelongsToGym(gymId: string, clientId: string): Promise<void> {
  const client = await clientRepository.findClientById(gymId, clientId);
  if (!client) throw new ClientNotInGymError();
}

export async function getRoutines(gymId: string): Promise<RoutineListItem[]> {
  const rows = await routineRepository.listRoutines(gymId);
  return rows.map(mapRowToListItem);
}

export async function getRoutinesByClient(gymId: string, clientId: string): Promise<RoutineListItem[]> {
  const rows = await routineRepository.listRoutinesByClient(gymId, clientId);
  return rows.map(mapRowToListItem);
}

export async function getRoutineById(gymId: string, id: string): Promise<RoutineListItem | null> {
  const row = await routineRepository.findRoutineById(gymId, id);
  return row ? mapRowToListItem(row) : null;
}

export async function createRoutine(gymId: string, input: RoutineFormInput): Promise<string> {
  const errors = validateRoutineForm(input);
  if (hasValidationErrors(errors)) throw new RoutineValidationError(errors);

  await assertClientBelongsToGym(gymId, input.clientId);

  const id = crypto.randomUUID();
  await routineRepository.createRoutine(gymId, id, {
    clientId: input.clientId,
    name: input.name.trim(),
    description: input.description.trim() || null,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    notes: input.notes.trim() || null,
  });
  return id;
}

export async function updateRoutine(
  gymId: string,
  id: string,
  input: RoutineFormInput,
): Promise<void> {
  // Se busca la rutina actual para permitir conservar un nombre/objetivo
  // histórico que ya no esté en el catálogo, siempre que no se haya
  // modificado (ver RoutineFormValidationOptions en routineValidation.ts).
  const current = await routineRepository.findRoutineById(gymId, id);
  if (!current) throw new RoutineNotFoundError();

  const errors = validateRoutineForm(input, {
    allowedName: current.name,
    allowedDescription: current.description,
  });
  if (hasValidationErrors(errors)) throw new RoutineValidationError(errors);

  await assertClientBelongsToGym(gymId, input.clientId);

  await routineRepository.updateRoutine(gymId, id, {
    clientId: input.clientId,
    name: input.name.trim(),
    description: input.description.trim() || null,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    notes: input.notes.trim() || null,
  });
}

export async function setRoutineStatus(
  gymId: string,
  id: string,
  status: RoutineStatus,
): Promise<void> {
  await routineRepository.setRoutineStatus(gymId, id, status);
}

// ---- Ejercicios de la rutina ----

export async function getRoutineExercises(
  gymId: string,
  routineId: string,
): Promise<RoutineExerciseListItem[]> {
  // La rutina se busca ya filtrada por gym_id; si no pertenece a este
  // gimnasio, no se listan sus ejercicios (aunque el routineId exista).
  const routine = await routineRepository.findRoutineById(gymId, routineId);
  if (!routine) throw new RoutineNotFoundError();

  const rows = await routineRepository.listRoutineExercises(routineId);
  return rows.map(mapExerciseRowToListItem);
}

/**
 * El modo (fuerza/cardio/movilidad) se deriva siempre de los metadatos del
 * ejercicio elegido (exercise_type/equipment del catálogo) — nunca del
 * nombre — para que el catálogo de Ejercicios siga siendo la única fuente
 * de verdad. Los campos que no aplican al modo resuelto se guardan como
 * NULL aunque el formulario los haya dejado con datos residuales de un
 * cambio de ejercicio previo.
 */
async function resolveExerciseForRoutine(
  gymId: string,
  exerciseId: string,
): Promise<ExerciseOptionRow> {
  const exercise = await exerciseRepository.findExerciseById(gymId, exerciseId);
  if (!exercise) throw new ExerciseNotAvailableError();
  return exercise;
}

function buildPersistedFields(
  input: RoutineExerciseFormInput,
  exercise: ExerciseOptionRow,
): RoutineExercisePersistedFields {
  const mode = getExerciseConfigurationMode(exercise.exercise_type);
  const cardioProfile = getCardioEquipmentProfile(exercise.equipment);
  const isCardioOrMobility = mode === "CARDIO_TIME" || mode === "MOBILITY";

  return {
    exerciseId: input.exerciseId,
    sets: mode === "STRENGTH" ? input.sets : null,
    reps: mode === "STRENGTH" ? input.reps : null,
    weight: mode === "STRENGTH" ? input.weight : null,
    restSeconds: mode === "STRENGTH" ? input.restSeconds : null,
    notes: input.notes.trim() || null,
    timeValue: isCardioOrMobility ? input.timeValue : null,
    timeUnit: isCardioOrMobility ? input.timeUnit : null,
    speedKmh: mode === "CARDIO_TIME" && cardioProfile === "TREADMILL" ? input.speedKmh : null,
    inclinePercent: mode === "CARDIO_TIME" && cardioProfile === "TREADMILL" ? input.inclinePercent : null,
    resistanceLevel:
      mode === "CARDIO_TIME" && (cardioProfile === "BIKE" || cardioProfile === "ROWER" || cardioProfile === "CLIMBER")
        ? input.resistanceLevel
        : null,
    rpm: mode === "CARDIO_TIME" && cardioProfile === "BIKE" ? input.rpm : null,
    intensityLabel: mode === "CARDIO_TIME" && cardioProfile === "GENERIC" ? input.intensityLabel : null,
  };
}

export async function addRoutineExercise(
  gymId: string,
  routineId: string,
  input: RoutineExerciseFormInput,
): Promise<string> {
  const routine = await routineRepository.findRoutineById(gymId, routineId);
  if (!routine) throw new RoutineNotFoundError();

  const exercise = await resolveExerciseForRoutine(gymId, input.exerciseId);
  const mode = getExerciseConfigurationMode(exercise.exercise_type);
  const cardioProfile = getCardioEquipmentProfile(exercise.equipment);

  const errors = validateRoutineExerciseForm(input, mode, cardioProfile);
  if (hasValidationErrors(errors)) throw new RoutineExerciseValidationError(errors);

  const sortOrder = await routineRepository.getNextSortOrder(routineId);
  const id = crypto.randomUUID();
  await routineRepository.addRoutineExercise(id, {
    ...buildPersistedFields(input, exercise),
    routineId,
    sortOrder,
  });
  return id;
}

export async function updateRoutineExercise(
  gymId: string,
  routineId: string,
  routineExerciseId: string,
  input: RoutineExerciseFormInput,
): Promise<void> {
  const routine = await routineRepository.findRoutineById(gymId, routineId);
  if (!routine) throw new RoutineNotFoundError();

  const exercise = await resolveExerciseForRoutine(gymId, input.exerciseId);
  const mode = getExerciseConfigurationMode(exercise.exercise_type);
  const cardioProfile = getCardioEquipmentProfile(exercise.equipment);

  const errors = validateRoutineExerciseForm(input, mode, cardioProfile);
  if (hasValidationErrors(errors)) throw new RoutineExerciseValidationError(errors);

  await routineRepository.updateRoutineExercise(
    routineId,
    routineExerciseId,
    buildPersistedFields(input, exercise),
  );
}

export async function removeRoutineExercise(
  gymId: string,
  routineId: string,
  routineExerciseId: string,
): Promise<void> {
  const routine = await routineRepository.findRoutineById(gymId, routineId);
  if (!routine) throw new RoutineNotFoundError();

  await routineRepository.removeRoutineExercise(routineId, routineExerciseId);
}
