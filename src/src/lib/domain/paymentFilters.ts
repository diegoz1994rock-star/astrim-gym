import type { PaymentFilters, PaymentListItem } from "@/types/payment";
import { normalizeSearchText } from "@/lib/utils";

export function filterPayments(payments: PaymentListItem[], filters: PaymentFilters): PaymentListItem[] {
  const search = normalizeSearchText(filters.search.trim());

  return payments.filter((payment) => {
    if (filters.method !== "ALL" && payment.method !== filters.method) return false;
    if (filters.status !== "ALL" && payment.status !== filters.status) return false;
    if (filters.dateFrom && payment.date < filters.dateFrom) return false;
    if (filters.dateTo && payment.date > filters.dateTo) return false;

    if (search) {
      const haystack = normalizeSearchText(
        `${payment.clientName} ${payment.clientDocument ?? ""} ${payment.concept ?? ""}`,
      );
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
