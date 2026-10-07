import { apiClient } from "@/lib/api-client";
import type { PlanResponse } from "@/types";

/** GET /api/plans: public, cheapest first. Pass isActive to filter. */
export async function getPlans(isActive?: boolean): Promise<PlanResponse[]> {
  const response = await apiClient.get<PlanResponse[]>("/api/plans", {
    params: { isActive },
  });
  return response.data;
}
