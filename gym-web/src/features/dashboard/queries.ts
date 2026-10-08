import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getAnalyticsSummary,
  getAttendanceRate,
  getMembersGrowth,
  getPlansDistribution,
  getRevenue,
  getTopCategories,
} from "@/features/dashboard/api";
import type { DayRange } from "@/features/dashboard/range";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  revenue: (range: DayRange) => [...dashboardKeys.all, "revenue", range] as const,
  growth: (months: number) => [...dashboardKeys.all, "growth", months] as const,
  attendance: (range: DayRange) => [...dashboardKeys.all, "attendance", range] as const,
  plans: () => [...dashboardKeys.all, "plans"] as const,
  categories: (range: DayRange) => [...dashboardKeys.all, "categories", range] as const,
};

/** The dashboard numbers. They refresh every minute while the page is open, so the screen stays live. */
export function useAnalyticsSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getAnalyticsSummary,
    refetchInterval: 60_000,
  });
}

// The charts change slowly, so they refresh every 5 minutes. keepPreviousData keeps the old chart
// on screen while a new period loads, instead of flashing a skeleton.
const CHART_REFRESH = 5 * 60_000;

export function useRevenue(range: DayRange) {
  return useQuery({
    queryKey: dashboardKeys.revenue(range),
    queryFn: () => getRevenue(range),
    placeholderData: keepPreviousData,
    refetchInterval: CHART_REFRESH,
  });
}

export function useMembersGrowth(months: number) {
  return useQuery({
    queryKey: dashboardKeys.growth(months),
    queryFn: () => getMembersGrowth(months),
    placeholderData: keepPreviousData,
    refetchInterval: CHART_REFRESH,
  });
}

export function useAttendanceRate(range: DayRange) {
  return useQuery({
    queryKey: dashboardKeys.attendance(range),
    queryFn: () => getAttendanceRate(range),
    placeholderData: keepPreviousData,
    refetchInterval: CHART_REFRESH,
  });
}

export function usePlansDistribution() {
  return useQuery({
    queryKey: dashboardKeys.plans(),
    queryFn: getPlansDistribution,
    refetchInterval: CHART_REFRESH,
  });
}

export function useTopCategories(range: DayRange) {
  return useQuery({
    queryKey: dashboardKeys.categories(range),
    queryFn: () => getTopCategories(range),
    placeholderData: keepPreviousData,
    refetchInterval: CHART_REFRESH,
  });
}
