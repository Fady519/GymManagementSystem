import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary } from "@/features/dashboard/api";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
};

/** The dashboard numbers. They refresh every minute while the page is open, so the screen stays live. */
export function useAnalyticsSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getAnalyticsSummary,
    refetchInterval: 60_000,
  });
}
