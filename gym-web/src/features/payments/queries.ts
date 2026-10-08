import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getPaymentSummary,
  getPayments,
  type PaymentFilters,
  type PaymentListParams,
} from "@/features/payments/api";

export const paymentKeys = {
  all: ["payments"] as const,
  list: (params: PaymentListParams) => [...paymentKeys.all, "list", params] as const,
  summary: (filters: PaymentFilters) => [...paymentKeys.all, "summary", filters] as const,
};

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => getPayments(params),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentSummary(filters: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.summary(filters),
    queryFn: () => getPaymentSummary(filters),
    placeholderData: keepPreviousData,
  });
}
