import type { UserRole } from "./auth";

export interface UserRecord {
  id: string;
  gym_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
}

export type LicenseStatus = "ACTIVE" | "GRACE_PERIOD" | "SUSPENDED" | "CANCELLED";

export interface GymRecord {
  id: string;
  name: string;
  slug: string;
  license_status: LicenseStatus;
  license_expiration_date: string | null;
  logo_path: string | null;
}

export interface GymSettingsRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  logo_path: string | null;
}

export type MembershipManualStatus = "SUSPENDED" | "CANCELLED";
export type PaymentMethod = "CASH" | "TRANSFER" | "OTHER";
export type PaymentStatus = "PAID" | "PENDING";

export interface MembershipRow {
  id: string;
  client_id: string;
  end_date: string;
  manual_status: MembershipManualStatus | null;
  price: number;
}

export interface ClientStatsRow {
  total: number;
  active: number;
}

export interface AttendanceCountsRow {
  today: number;
  week: number;
}

export interface RevenuePoint {
  month: string;
  total: number;
}

export type ClientGender = "M" | "F" | "OTHER";
export type ClientGoal =
  | "FAT_LOSS"
  | "MUSCLE_GAIN"
  | "STRENGTH"
  | "ENDURANCE"
  | "MAINTENANCE"
  | "OTHER";
export type ClientStatus = "ACTIVE" | "INACTIVE";

export interface ClientRow {
  id: string;
  gym_id: string;
  name: string;
  document: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  weight: number | null;
  height: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  leg: number | null;
  calf: number | null;
  hip: number | null;
  body_fat: number | null;
  muscle_mass: number | null;
  gender: ClientGender | null;
  goal: ClientGoal | null;
  trainer_id: string | null;
  trainer_name: string | null;
  join_date: string | null;
  photo_path: string | null;
  observations: string | null;
  status: ClientStatus;
  attendance_code: string | null;
  face_consent: number;
  face_enrolled_at: string | null;
  cloud_uid: string | null;
  membership_id: string | null;
  membership_plan_name: string | null;
  membership_start_date: string | null;
  membership_end_date: string | null;
  membership_manual_status: MembershipManualStatus | null;
  membership_price: number | null;
}

export interface TrainerOptionRow {
  id: string;
  name: string;
}

export type TrainerStatus = "ACTIVE" | "INACTIVE";

export interface TrainerRow {
  id: string;
  gym_id: string;
  name: string;
  document: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  specialty: string | null;
  description: string | null;
  photo_path: string | null;
  join_date: string | null;
  observations: string | null;
  status: TrainerStatus;
  client_count: number;
}

export interface MembershipPlanRow {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
  active: number;
  client_count: number;
}

export interface MembershipListRow {
  id: string;
  gym_id: string;
  client_id: string;
  client_name: string;
  client_document: string | null;
  plan_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  price: number;
  payment_status: PaymentStatus;
  method: PaymentMethod | null;
  manual_status: MembershipManualStatus | null;
  notes: string | null;
}

export interface PaymentRow {
  id: string;
  gym_id: string;
  client_id: string;
  client_name: string;
  client_document: string | null;
  membership_id: string | null;
  plan_name: string | null;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  concept: string | null;
}

export type RoutineStatus = "ACTIVE" | "FINISHED" | "INACTIVE";

export interface RoutineRow {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  status: RoutineStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  exercise_count: number;
  assignment_count: number;
}

export interface RoutineAssignmentRow {
  id: string;
  routine_id: string;
  client_id: string;
  client_name: string;
  client_document: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

/** Rutina asignada a UN cliente en particular (su propia vigencia), para ProgressPage. */
export interface ClientRoutineRow {
  id: string;
  name: string;
  description: string | null;
  status: RoutineStatus;
  notes: string | null;
  exercise_count: number;
  start_date: string | null;
  end_date: string | null;
}

export interface ExerciseOptionRow {
  id: string;
  name: string;
  category: string | null;
  muscle_group: string | null;
  exercise_type: string | null;
  equipment: string | null;
}

export interface RoutineExerciseRow {
  id: string;
  routine_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_type: string | null;
  equipment: string | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  time_value: number | null;
  time_unit: string | null;
  speed_kmh: number | null;
  incline_percent: number | null;
  resistance_level: number | null;
  rpm: number | null;
  intensity_label: string | null;
  sort_order: number;
}

export type ExerciseStatus = "ACTIVE" | "INACTIVE";
export type ExerciseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface ExerciseRow {
  id: string;
  gym_id: string | null;
  name: string;
  category: string | null;
  description: string | null;
  muscle_group: string | null;
  secondary_muscles: string | null;
  level: ExerciseLevel | null;
  exercise_type: string | null;
  equipment: string | null;
  instructions: string | null;
  video_path: string | null;
  status: ExerciseStatus;
}

export type AttendanceStatus = "PRESENT" | "ABSENT";

export interface AttendanceRow {
  id: string;
  gym_id: string;
  client_id: string;
  client_name: string;
  client_document: string | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  membership_id: string | null;
  plan_name: string | null;
  notes: string | null;
  entry_method: string | null;
  exit_method: string | null;
  device_id: string | null;
}

export interface AttendeeCountRow {
  client_id: string;
  client_name: string;
  visits: number;
}

export type DeviceType =
  | "RECEPTION_TABLET"
  | "ADMIN_COMPUTER"
  | "BIOMETRIC_READER"
  | "ACCESS_GATE"
  | "OTHER";
export type DeviceStatus = "PENDING" | "ACTIVE" | "DISABLED" | "REVOKED";
export type PairingCodeStatus = "PENDING" | "USED" | "EXPIRED" | "CANCELLED";

export interface DeviceRow {
  id: string;
  gym_id: string;
  name: string;
  device_type: DeviceType;
  status: DeviceStatus;
  platform: string | null;
  app_version: string | null;
  api_token: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
}

export interface DevicePairingCodeRow {
  id: string;
  device_id: string;
  gym_id: string;
  code: string;
  status: PairingCodeStatus;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export interface MeasurementRow {
  id: string;
  gym_id: string;
  client_id: string;
  date: string;
  weight: number | null;
  height: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  leg: number | null;
  calf: number | null;
  hip: number | null;
  body_fat: number | null;
  muscle_mass: number | null;
  notes: string | null;
}

export interface ClassTypeRow {
  id: string;
  gym_id: string | null;
  name: string;
  status: string;
}

export type ClassStatus = "PROGRAMADA" | "ABIERTA" | "COMPLETA" | "EN_CURSO" | "FINALIZADA" | "CANCELADA";

export interface ClassRow {
  id: string;
  gym_id: string;
  class_type_id: string;
  class_type_name: string;
  trainer_id: string | null;
  trainer_name: string | null;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: ClassStatus;
  description: string | null;
  notes: string | null;
  recurrence_group_id: string | null;
  enrolled_count: number;
}

export interface ClassBlockRow {
  id: string;
  class_id: string;
  name: string;
  block_type: string;
  sort_order: number;
}

export interface ClassBlockExerciseRow {
  id: string;
  block_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_type: string | null;
  equipment: string | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  time_value: number | null;
  time_unit: string | null;
  speed_kmh: number | null;
  incline_percent: number | null;
  resistance_level: number | null;
  rpm: number | null;
  intensity_label: string | null;
  sort_order: number;
}

export interface ClassEnrollmentRow {
  id: string;
  class_id: string;
  client_id: string;
  client_name: string;
  client_document: string | null;
}

// ---- Plan de Alimentación (mismo diseño que Rutina, ver 0032_meal_plans.sql) ----

export type MealPlanStatus = "ACTIVE" | "FINISHED" | "INACTIVE";

/** Catálogo de alimentos: gym_id NULL = global, gym_id NOT NULL = propio del gimnasio. */
export interface FoodRow {
  id: string;
  gym_id: string | null;
  name: string;
  category: string;
  default_unit: string;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlanRow {
  id: string;
  gym_id: string;
  trainer_id: string | null;
  name: string;
  description: string | null;
  status: MealPlanStatus;
  goal: string | null;
  notes: string | null;
  daily_calories_target: number | null;
  daily_protein_target: number | null;
  daily_carbs_target: number | null;
  daily_fat_target: number | null;
  created_at: string;
  updated_at: string;
  category_target_count: number;
  allowed_food_count: number;
  assignment_count: number;
}

/** Meta por categoría de un plan (ej. "Proteína: 180 g/día"). Ver 0033_meal_plan_targets.sql. */
export interface MealPlanCategoryTargetRow {
  id: string;
  meal_plan_id: string;
  category: string;
  target_quantity: number;
  target_unit: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Alimento del catálogo permitido para un plan (whitelist). Denormaliza foods para no tener que joinear en la UI. */
export interface MealPlanAllowedFoodRow {
  id: string;
  meal_plan_id: string;
  food_id: string;
  food_name: string;
  category: string;
  default_unit: string;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  created_at: string;
}

export interface MealPlanAssignmentRow {
  id: string;
  meal_plan_id: string;
  client_id: string;
  client_name: string;
  client_document: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

/** Plan de alimentación asignado a UN cliente en particular (su propia vigencia). */
export interface ClientMealPlanRow {
  id: string;
  name: string;
  description: string | null;
  status: MealPlanStatus;
  goal: string | null;
  notes: string | null;
  daily_calories_target: number | null;
  daily_protein_target: number | null;
  daily_carbs_target: number | null;
  daily_fat_target: number | null;
  start_date: string | null;
  end_date: string | null;
}

