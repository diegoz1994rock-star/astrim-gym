import type { CapacityStatus, ClassListItem } from "@/types/class";

/** Orden cronológico por hora de inicio, para la lista de un día. */
export function sortClassesByStartTime(classes: ClassListItem[]): ClassListItem[] {
  return [...classes].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Nunca se guarda en DB: se calcula en cada render a partir de las
 * inscripciones reales, así que siempre refleja el estado actual aunque
 * cambien las inscripciones sin recargar la clase completa.
 */
export function computeCapacityStatus(enrolledCount: number, capacity: number): CapacityStatus {
  if (capacity <= 0 || enrolledCount >= capacity) return "FULL";
  if (enrolledCount >= capacity - 1) return "ALMOST_FULL";
  return "AVAILABLE";
}
