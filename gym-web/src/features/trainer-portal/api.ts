import { apiClient } from "@/lib/api-client";
import type { SessionResponsePagedResult, TrainerResponse } from "@/types";

/** GET /api/trainer/me: the logged-in trainer's profile (name, specialty...). */
export async function getMyTrainerProfile(): Promise<TrainerResponse> {
  const response = await apiClient.get<TrainerResponse>("/api/trainer/me");
  return response.data;
}

/** GET /api/trainer/sessions?state=Upcoming: only this trainer's classes, soonest first. */
export async function getMyUpcomingSessions(pageSize: number): Promise<SessionResponsePagedResult> {
  const response = await apiClient.get<SessionResponsePagedResult>("/api/trainer/sessions", {
    params: { state: "Upcoming", page: 1, pageSize },
  });
  return response.data;
}
