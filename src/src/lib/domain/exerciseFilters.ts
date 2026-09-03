import type { ExerciseFilters, ExerciseListItem } from "@/types/exercise";
import { normalizeSearchText } from "@/lib/utils";

export function filterExercises(
  exercises: ExerciseListItem[],
  filters: ExerciseFilters,
): ExerciseListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return exercises.filter((exercise) => {
    if (filters.status !== "ALL" && exercise.status !== filters.status) return false;
    if (filters.category !== "ALL" && exercise.category !== filters.category) return false;
    if (filters.muscleGroup !== "ALL" && exercise.muscleGroup !== filters.muscleGroup) return false;
    if (filters.exerciseType !== "ALL" && exercise.exerciseType !== filters.exerciseType) return false;
    if (filters.equipment !== "ALL" && exercise.equipment !== filters.equipment) return false;

    if (search) {
      const haystack = normalizeSearchText(exercise.name);
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
