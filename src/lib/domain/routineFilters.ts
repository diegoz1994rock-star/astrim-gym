import type { RoutineFilters, RoutineListItem } from "@/types/routine";
import { normalizeSearchText } from "@/lib/utils";

export function filterRoutines(routines: RoutineListItem[], filters: RoutineFilters): RoutineListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return routines.filter((routine) => {
    if (filters.status !== "ALL" && routine.status !== filters.status) return false;

    if (search) {
      const haystack = normalizeSearchText(routine.name);
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
