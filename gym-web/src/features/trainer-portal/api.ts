import { apiClient } from "@/lib/api-client";
import type {
  SessionBookingItem,
  SessionResponse,
  SessionResponsePagedResult,
  SessionState,
  TrainerResponse,
} from "@/types";

/** GET /api/trainer/me: the logged-in trainer's profile (name, specialty...). */
export async function getMyTrainerProfile(): Promise<TrainerResponse> {
  const response = await apiClient.get<TrainerResponse>("/api/trainer/me");
  return response.data;
}

export type MySessionsParams = {
  state?: SessionState;
  /** UTC ISO strings: classes that START in [from, to). */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

/**
 * GET /api/trainer/sessions: only this trainer's classes (the API takes the trainer id from the
 * token). Upcoming/Ongoing lists come soonest first; Completed/Cancelled newest first.
 */
export async function getMySessions(params: MySessionsParams): Promise<SessionResponsePagedResult> {
  const response = await apiClient.get<SessionResponsePagedResult>("/api/trainer/sessions", {
    params: { page: 1, ...params },
  });
  return response.data;
}

/**
 * GET /api/sessions/{id}: one class. The trainer API has no "get one" endpoint, but the public
 * schedule does; the caller checks `trainerId` so a trainer never sees someone else's class.
 */
export async function getSession(id: number): Promise<SessionResponse> {
  const response = await apiClient.get<SessionResponse>(`/api/sessions/${id}`);
  return response.data;
}

/** GET /api/trainer/sessions/{id}/bookings: everyone who booked (sorted by name). 403 if not mine. */
export async function getMySessionBookings(id: number): Promise<SessionBookingItem[]> {
  const response = await apiClient.get<SessionBookingItem[]>(
    `/api/trainer/sessions/${id}/bookings`,
  );
  return response.data;
}

/** POST /api/trainer/bookings/{id}/attend: only works while the class is running (else 409). */
export async function markBookingAttended(bookingId: number): Promise<void> {
  await apiClient.post(`/api/trainer/bookings/${bookingId}/attend`);
}
