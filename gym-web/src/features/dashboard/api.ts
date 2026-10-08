import { apiClient } from "@/lib/api-client";
import type {
  AnalyticsSummaryResponse,
  AttendanceRateResponse,
  MembersGrowthPoint,
  PlanDistributionItem,
  RevenueResponse,
  TopCategoryItem,
} from "@/types";
import type { DayRange } from "@/features/dashboard/range";

/** GET /api/analytics/summary: today's key numbers for the admin dashboard (Admin / SuperAdmin only). */
export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  const response = await apiClient.get<AnalyticsSummaryResponse>("/api/analytics/summary");
  return response.data;
}

/** GET /api/analytics/revenue: income, refunds and net per day or per month. Every day/month is listed (0 when empty). */
export async function getRevenue(range: DayRange): Promise<RevenueResponse> {
  const response = await apiClient.get<RevenueResponse>("/api/analytics/revenue", {
    params: { period: range.period, from: range.from, to: range.to },
  });
  return response.data;
}

/** GET /api/analytics/members-growth: new members per month and the running total. */
export async function getMembersGrowth(months: number): Promise<MembersGrowthPoint[]> {
  const response = await apiClient.get<MembersGrowthPoint[]>("/api/analytics/members-growth", {
    params: { months },
  });
  return response.data;
}

/** GET /api/analytics/attendance-rate: booked vs. attended, for classes that already ended in the range. */
export async function getAttendanceRate(range: DayRange): Promise<AttendanceRateResponse> {
  const response = await apiClient.get<AttendanceRateResponse>("/api/analytics/attendance-rate", {
    params: { from: range.from, to: range.to },
  });
  return response.data;
}

/** GET /api/analytics/plans-distribution: running memberships per plan, right now. */
export async function getPlansDistribution(): Promise<PlanDistributionItem[]> {
  const response = await apiClient.get<PlanDistributionItem[]>("/api/analytics/plans-distribution");
  return response.data;
}

/** GET /api/analytics/top-categories: the most booked class categories in the range. */
export async function getTopCategories(range: DayRange, take = 5): Promise<TopCategoryItem[]> {
  const response = await apiClient.get<TopCategoryItem[]>("/api/analytics/top-categories", {
    params: { from: range.from, to: range.to, take },
  });
  return response.data;
}
