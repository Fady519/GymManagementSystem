import { apiClient } from "@/lib/api-client";
import type { CreatePlanRequest, PlanResponse, UpdatePlanRequest } from "@/types";

/** GET /api/plans: public, cheapest first. Pass isActive to filter. */
export async function getPlans(isActive?: boolean): Promise<PlanResponse[]> {
  const response = await apiClient.get<PlanResponse[]>("/api/plans", {
    params: { isActive },
  });
  return response.data;
}

/** POST /api/plans (admin). New plans start active. 409 Plan.NameTaken if the name is used. */
export async function createPlan(body: CreatePlanRequest): Promise<PlanResponse> {
  const response = await apiClient.post<PlanResponse>("/api/plans", body);
  return response.data;
}

/** PUT /api/plans/{id} (admin). Memberships already sold keep their old price and duration. */
export async function updatePlan(id: number, body: UpdatePlanRequest): Promise<PlanResponse> {
  const response = await apiClient.put<PlanResponse>(`/api/plans/${id}`, body);
  return response.data;
}

/** PATCH /api/plans/{id}/status (admin). Inactive plans can't be sold. */
export async function setPlanStatus(id: number, isActive: boolean): Promise<PlanResponse> {
  const response = await apiClient.patch<PlanResponse>(`/api/plans/${id}/status`, { isActive });
  return response.data;
}

/** DELETE /api/plans/{id} (admin). 409 Plan.HasActiveMemberships while members still use it. */
export async function deletePlan(id: number): Promise<void> {
  await apiClient.delete(`/api/plans/${id}`);
}
