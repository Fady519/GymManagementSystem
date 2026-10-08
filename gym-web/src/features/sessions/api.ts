import { apiClient } from "@/lib/api-client";
import type {
  AvailableMemberItem,
  BookingResponse,
  SaveSessionRequest,
  SessionBookingItem,
  SessionResponse,
  SessionResponsePagedResult,
  SessionState,
} from "@/types";

/** GET /api/sessions?state=Upcoming: public schedule, soonest first, paged. */
export async function getUpcomingSessions(pageSize: number): Promise<SessionResponsePagedResult> {
  const response = await apiClient.get<SessionResponsePagedResult>("/api/sessions", {
    params: { state: "Upcoming", page: 1, pageSize },
  });
  return response.data;
}

export type SessionListParams = {
  state: SessionState | null;
  trainerId: number | null;
  categoryId: number | null;
  /** UTC, inclusive. Filters on the start time. */
  from: string | null;
  /** UTC, exclusive. */
  to: string | null;
  page: number;
  pageSize: number;
};

/** GET /api/sessions: filtered by state, coach, category and dates; soonest first. */
export async function getSessions(params: SessionListParams): Promise<SessionResponsePagedResult> {
  const response = await apiClient.get<SessionResponsePagedResult>("/api/sessions", {
    params: {
      state: params.state ?? undefined,
      trainerId: params.trainerId ?? undefined,
      categoryId: params.categoryId ?? undefined,
      from: params.from ?? undefined,
      to: params.to ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return response.data;
}

/** GET /api/sessions/{id} */
export async function getSession(id: number): Promise<SessionResponse> {
  const response = await apiClient.get<SessionResponse>(`/api/sessions/${id}`);
  return response.data;
}

/** POST /api/sessions (admin). Times are UTC; the coach must be free and teach the category. */
export async function createSession(body: SaveSessionRequest): Promise<SessionResponse> {
  const response = await apiClient.post<SessionResponse>("/api/sessions", body);
  return response.data;
}

/** PUT /api/sessions/{id} (admin): upcoming classes only. */
export async function updateSession(
  id: number,
  body: SaveSessionRequest,
): Promise<SessionResponse> {
  const response = await apiClient.put<SessionResponse>(`/api/sessions/${id}`, body);
  return response.data;
}

/** POST /api/sessions/{id}/cancel (admin). Cancels every booking and emails the reason. */
export async function cancelSession(id: number, reason: string): Promise<void> {
  await apiClient.post(`/api/sessions/${id}/cancel`, { reason });
}

/** DELETE /api/sessions/{id} (admin): only an upcoming class nobody booked. */
export async function deleteSession(id: number): Promise<void> {
  await apiClient.delete(`/api/sessions/${id}`);
}

/** GET /api/sessions/{id}/bookings: everyone who booked (including cancelled bookings). */
export async function getSessionBookings(id: number): Promise<SessionBookingItem[]> {
  const response = await apiClient.get<SessionBookingItem[]>(`/api/sessions/${id}/bookings`);
  return response.data;
}

/**
 * GET /api/sessions/{id}/available-members (admin): members who can be booked into this class
 * right now (valid membership on that date, not already booked, free at that time). Max 50.
 */
export async function getAvailableMembers(
  id: number,
  search: string,
): Promise<AvailableMemberItem[]> {
  const response = await apiClient.get<AvailableMemberItem[]>(
    `/api/sessions/${id}/available-members`,
    { params: { search: search || undefined } },
  );
  return response.data;
}

/** POST /api/bookings (admin books a member). */
export async function createBooking(sessionId: number, memberId: number): Promise<BookingResponse> {
  const response = await apiClient.post<BookingResponse>("/api/bookings", { sessionId, memberId });
  return response.data;
}

/** POST /api/bookings/{id}/cancel. The reception can cancel until the class starts. */
export async function cancelBooking(id: number): Promise<void> {
  await apiClient.post(`/api/bookings/${id}/cancel`);
}

/** POST /api/bookings/{id}/attend: only while the class is running. */
export async function attendBooking(id: number): Promise<void> {
  await apiClient.post(`/api/bookings/${id}/attend`);
}
