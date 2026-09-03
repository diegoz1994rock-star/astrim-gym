import type { TrainerStatus } from "./db";

export type { TrainerStatus };

export interface TrainerFormInput {
  name: string;
  document: string;
  birthDate: string | null;
  phone: string;
  email: string;
  address: string;
  specialty: string;
  description: string;
  photoPath: string | null;
  joinDate: string | null;
  observations: string;
  status: TrainerStatus;
}

export interface TrainerListItem {
  id: string;
  name: string;
  document: string | null;
  birthDate: string | null;
  age: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  specialty: string | null;
  description: string | null;
  photoPath: string | null;
  joinDate: string | null;
  observations: string | null;
  status: TrainerStatus;
  clientCount: number;
}

export interface TrainerFilters {
  search: string;
  status: "ALL" | TrainerStatus;
  specialty: "ALL" | string;
}

export const DEFAULT_TRAINER_FILTERS: TrainerFilters = {
  search: "",
  status: "ALL",
  specialty: "ALL",
};

export function emptyTrainerForm(): TrainerFormInput {
  return {
    name: "",
    document: "",
    birthDate: null,
    phone: "",
    email: "",
    address: "",
    specialty: "",
    description: "",
    photoPath: null,
    joinDate: new Date().toISOString().slice(0, 10),
    observations: "",
    status: "ACTIVE",
  };
}

export function trainerToFormInput(trainer: TrainerListItem): TrainerFormInput {
  return {
    name: trainer.name,
    document: trainer.document ?? "",
    birthDate: trainer.birthDate,
    phone: trainer.phone ?? "",
    email: trainer.email ?? "",
    address: trainer.address ?? "",
    specialty: trainer.specialty ?? "",
    description: trainer.description ?? "",
    photoPath: trainer.photoPath,
    joinDate: trainer.joinDate,
    observations: trainer.observations ?? "",
    status: trainer.status,
  };
}
