import { apiClient } from "@/lib/api-client";
import type { SessionResponsePagedResult } from "@/types";

/** GET /api/sessions?state=Upcoming: public schedule, soonest first, paged. */
export async function getUpcomingSessions(pageSize: number): Promise<SessionResponsePagedResult> {
  const response = await apiClient.get<SessionResponsePagedResult>("/api/sessions", {
    params: { state: "Upcoming", page: 1, pageSize },
  });
  return response.data;
}
