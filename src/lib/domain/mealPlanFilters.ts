import type { MealPlanFilters, MealPlanListItem } from "@/types/mealPlan";
import { normalizeSearchText } from "@/lib/utils";

export function filterMealPlans(plans: MealPlanListItem[], filters: MealPlanFilters): MealPlanListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return plans.filter((plan) => {
    if (filters.status !== "ALL" && plan.status !== filters.status) return false;

    if (search) {
      const haystack = normalizeSearchText(plan.name);
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
