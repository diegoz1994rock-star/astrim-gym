import type { MembershipFilters, MembershipListItem } from "@/types/membership";
import { normalizeSearchText } from "@/lib/utils";

export function filterMemberships(
  memberships: MembershipListItem[],
  filters: MembershipFilters,
): MembershipListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return memberships.filter((membership) => {
    if (filters.status !== "ALL" && membership.status !== filters.status) return false;
    if (filters.planId !== "ALL" && membership.planId !== filters.planId) return false;

    if (search) {
      const haystack = normalizeSearchText(
        `${membership.clientName} ${membership.clientDocument ?? ""}`,
      );
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
