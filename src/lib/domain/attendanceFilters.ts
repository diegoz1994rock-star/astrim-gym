import type { AttendanceFilters, AttendanceListItem } from "@/types/attendance";
import { normalizeSearchText } from "@/lib/utils";

export function filterAttendance(
  records: AttendanceListItem[],
  filters: AttendanceFilters,
): AttendanceListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return records.filter((record) => {
    if (filters.dateFrom && record.date < filters.dateFrom) return false;
    if (filters.dateTo && record.date > filters.dateTo) return false;

    if (search) {
      const haystack = normalizeSearchText(`${record.clientName} ${record.clientDocument ?? ""}`);
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
