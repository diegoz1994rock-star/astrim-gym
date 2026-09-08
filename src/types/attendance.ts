import type { AttendanceStatus } from "./db";

export type { AttendanceStatus };

/**
 * Método con el que se autorizó una entrada/salida. QR/APP/BIOMETRIC ya
 * están soportados por el esquema aunque hoy solo PIN y MANUAL (registro
 * manual desde el panel) tengan una implementación real.
 */
export type AttendanceMethod = "PIN" | "QR" | "APP" | "BIOMETRIC" | "MANUAL" | "FACE";

export const ATTENDANCE_METHOD_LABELS: Record<AttendanceMethod, string> = {
  PIN: "PIN",
  QR: "Código QR",
  APP: "App móvil",
  BIOMETRIC: "Huella",
  MANUAL: "Manual",
  FACE: "Reconocimiento facial",
};

export interface RegisterAttendanceInput {
  clientId: string;
  notes: string;
}

export interface AttendanceListItem {
  id: string;
  clientId: string;
  clientName: string;
  clientDocument: string | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  membershipId: string | null;
  planName: string | null;
  notes: string | null;
  entryMethod: AttendanceMethod | null;
  exitMethod: AttendanceMethod | null;
  /** Calculado: hay hora de entrada y todavía no se registró salida. */
  isInside: boolean;
}

export interface AttendanceFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_ATTENDANCE_FILTERS: AttendanceFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
};

export interface AttendeeRanking {
  clientId: string;
  clientName: string;
  visits: number;
}

export interface AttendanceSummary {
  today: number;
  insideNow: number;
  thisMonth: number;
  averagePerDayThisMonth: number;
  topAttendees: AttendeeRanking[];
}
