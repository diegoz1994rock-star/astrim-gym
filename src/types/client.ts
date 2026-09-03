import type { MembershipStatus } from "@/lib/domain/membershipStatus";
import type { ClientGender, ClientGoal, ClientStatus } from "./db";

export type { ClientGender, ClientGoal, ClientStatus };

export interface ClientFormInput {
  name: string;
  document: string;
  birthDate: string | null;
  phone: string;
  email: string;
  address: string;
  weight: number | null;
  height: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  leg: number | null;
  calf: number | null;
  hip: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  gender: ClientGender | null;
  goal: ClientGoal | null;
  trainerId: string | null;
  joinDate: string | null;
  photoPath: string | null;
  observations: string;
  status: ClientStatus;
  attendanceCode: string | null;
}

export interface ClientListItem {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  birthDate: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  leg: number | null;
  calf: number | null;
  hip: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  gender: ClientGender | null;
  goal: ClientGoal | null;
  trainerId: string | null;
  trainerName: string | null;
  joinDate: string | null;
  photoPath: string | null;
  observations: string | null;
  status: ClientStatus;
  attendanceCode: string | null;
  membershipId: string | null;
  membershipPlanName: string | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  membershipPrice: number | null;
  membershipStatus: MembershipStatus | null;
}

export interface ClientFilters {
  search: string;
  status: "ALL" | ClientStatus;
  membership: "ALL" | MembershipStatus;
  trainerId: "ALL" | string;
}

export const DEFAULT_CLIENT_FILTERS: ClientFilters = {
  search: "",
  status: "ALL",
  membership: "ALL",
  trainerId: "ALL",
};

export const CLIENT_GOAL_LABELS: Record<ClientGoal, string> = {
  FAT_LOSS: "Pérdida de grasa",
  MUSCLE_GAIN: "Ganancia muscular",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  MAINTENANCE: "Mantenimiento",
  OTHER: "Otro",
};

export const CLIENT_GENDER_LABELS: Record<ClientGender, string> = {
  M: "Masculino",
  F: "Femenino",
  OTHER: "Otro",
};

export function emptyClientForm(): ClientFormInput {
  return {
    name: "",
    document: "",
    birthDate: null,
    phone: "",
    email: "",
    address: "",
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
    gender: null,
    goal: null,
    trainerId: null,
    joinDate: new Date().toISOString().slice(0, 10),
    photoPath: null,
    observations: "",
    status: "ACTIVE",
    attendanceCode: null,
  };
}

export function clientToFormInput(client: ClientListItem): ClientFormInput {
  return {
    name: client.name,
    document: client.document ?? "",
    birthDate: client.birthDate,
    phone: client.phone ?? "",
    email: client.email ?? "",
    address: client.address ?? "",
    weight: client.weight,
    height: client.height,
    waist: client.waist,
    chest: client.chest,
    arm: client.arm,
    leg: client.leg,
    calf: client.calf,
    hip: client.hip,
    bodyFat: client.bodyFat,
    muscleMass: client.muscleMass,
    gender: client.gender,
    goal: client.goal,
    trainerId: client.trainerId,
    joinDate: client.joinDate,
    photoPath: client.photoPath,
    observations: client.observations ?? "",
    status: client.status,
    attendanceCode: client.attendanceCode,
  };
}
