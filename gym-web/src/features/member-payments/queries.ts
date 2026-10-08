import { useQuery } from "@tanstack/react-query";
import { getMyPayments } from "@/features/member-payments/api";
import { memberPortalKeys } from "@/features/member-portal/queries";

// Under the member-portal key, so invalidating memberPortalKeys.all also refreshes the payments.
export const memberPaymentsKeys = {
  list: () => [...memberPortalKeys.all, "payments"] as const,
};

export function useMyPayments() {
  return useQuery({ queryKey: memberPaymentsKeys.list(), queryFn: getMyPayments });
}
