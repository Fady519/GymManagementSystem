import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkIn, getCheckIns, type CheckInListParams } from "@/features/check-ins/api";
import { dashboardKeys } from "@/features/dashboard/queries";

export const checkInKeys = {
  all: ["check-ins"] as const,
  list: (params: CheckInListParams) => [...checkInKeys.all, "list", params] as const,
};

/**
 * One page of the log. `live` refreshes it every 30 seconds (used by the check-in desk,
 * where another reception PC may be scanning at the same time).
 */
export function useCheckIns(params: CheckInListParams, { live = false } = {}) {
  return useQuery({
    queryKey: checkInKeys.list(params),
    queryFn: () => getCheckIns(params),
    placeholderData: keepPreviousData,
    refetchInterval: live ? 30_000 : false,
  });
}

/** Scans a code. Afterwards the log and the dashboard's "check-ins today" are refreshed. */
export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkIn,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: checkInKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.summary() }),
      ]),
  });
}
