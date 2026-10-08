import { apiClient } from "@/lib/api-client";
import type { AnalyticsSummaryResponse } from "@/types";

/** GET /api/analytics/summary: today's key numbers for the admin dashboard (Admin / SuperAdmin only). */
export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  const response = await apiClient.get<AnalyticsSummaryResponse>("/api/analytics/summary");
  return response.data;
}
