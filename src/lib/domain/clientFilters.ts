import type { ClientFilters, ClientListItem } from "@/types/client";
import { normalizeSearchText } from "@/lib/utils";

export function filterClients(clients: ClientListItem[], filters: ClientFilters): ClientListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return clients.filter((client) => {
    if (filters.status !== "ALL" && client.status !== filters.status) return false;
    if (filters.membership !== "ALL" && client.membershipStatus !== filters.membership) return false;
    if (filters.trainerId !== "ALL" && client.trainerId !== filters.trainerId) return false;

    if (search) {
      const haystack = normalizeSearchText(
        `${client.name} ${client.document ?? ""} ${client.phone ?? ""}`,
      );
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
