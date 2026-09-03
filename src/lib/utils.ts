import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/** Normaliza texto para búsquedas insensibles a mayúsculas y acentos. */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_PATTERN, "").toLowerCase();
}
