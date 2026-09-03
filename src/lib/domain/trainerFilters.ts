import type { TrainerFilters, TrainerListItem } from "@/types/trainer";
import { normalizeSearchText } from "@/lib/utils";

export function filterTrainers(trainers: TrainerListItem[], filters: TrainerFilters): TrainerListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return trainers.filter((trainer) => {
    if (filters.status !== "ALL" && trainer.status !== filters.status) return false;
    if (filters.specialty !== "ALL" && trainer.specialty !== filters.specialty) return false;

    if (search) {
      const haystack = normalizeSearchText(
        `${trainer.name} ${trainer.document ?? ""} ${trainer.phone ?? ""}`,
      );
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
