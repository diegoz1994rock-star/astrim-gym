import { describe, expect, it } from "vitest";
import { filterAttendance } from "./attendanceFilters";
import { DEFAULT_ATTENDANCE_FILTERS, type AttendanceListItem } from "@/types/attendance";

const RECORDS: AttendanceListItem[] = [
  {
    id: "a1",
    clientId: "c1",
    clientName: "Juan Pérez",
    clientDocument: "1122334455",
    date: "2026-08-29",
    checkIn: "08:00:00",
    checkOut: "09:30:00",
    status: "PRESENT",
    membershipId: null,
    planName: null,
    notes: null,
    entryMethod: null,
    exitMethod: null,
    isInside: false,
  },
  {
    id: "a2",
    clientId: "c2",
    clientName: "María Gómez",
    clientDocument: "2233445566",
    date: "2026-08-29",
    checkIn: "10:00:00",
    checkOut: null,
    status: "PRESENT",
    membershipId: null,
    planName: null,
    notes: null,
    entryMethod: null,
    exitMethod: null,
    isInside: true,
  },
  {
    id: "a3",
    clientId: "c1",
    clientName: "Juan Pérez",
    clientDocument: "1122334455",
    date: "2026-08-01",
    checkIn: "08:00:00",
    checkOut: "09:00:00",
    status: "PRESENT",
    membershipId: null,
    planName: null,
    notes: null,
    entryMethod: null,
    exitMethod: null,
    isInside: false,
  },
];

describe("filterAttendance", () => {
  it("4/5. sin filtros devuelve todo el historial", () => {
    expect(filterAttendance(RECORDS, DEFAULT_ATTENDANCE_FILTERS)).toHaveLength(3);
  });

  it("6. filtra por rango de fechas", () => {
    const result = filterAttendance(RECORDS, {
      ...DEFAULT_ATTENDANCE_FILTERS,
      dateFrom: "2026-08-29",
      dateTo: "2026-08-29",
    });
    expect(result.map((r) => r.id)).toEqual(["a1", "a2"]);
  });

  it("7. busca por nombre de cliente", () => {
    const result = filterAttendance(RECORDS, { ...DEFAULT_ATTENDANCE_FILTERS, search: "maría" });
    expect(result.map((r) => r.id)).toEqual(["a2"]);
  });

  it("busca por documento", () => {
    const result = filterAttendance(RECORDS, { ...DEFAULT_ATTENDANCE_FILTERS, search: "2233445566" });
    expect(result.map((r) => r.id)).toEqual(["a2"]);
  });

  it("combina cliente + rango de fechas", () => {
    const result = filterAttendance(RECORDS, {
      search: "juan",
      dateFrom: "2026-08-15",
      dateTo: "2026-08-31",
    });
    expect(result.map((r) => r.id)).toEqual(["a1"]);
  });
});
