import { apiClient } from "@/lib/api-client";
import type {
  BookingResponse,
  CheckInCodeResponse,
  MemberResponse,
  MembershipResponse,
  MyBookingItemPagedResult,
} from "@/types";

/** GET /api/me: the logged-in member's profile. */
export async function getMyProfile(): Promise<MemberResponse> {
  const response = await apiClient.get<MemberResponse>("/api/me");
  return response.data;
}

/** GET /api/me/memberships: current and past memberships, newest first. */
export async function getMyMemberships(): Promise<MembershipResponse[]> {
  const response = await apiClient.get<MembershipResponse[]>("/api/me/memberships");
  return response.data;
}

/**
 * GET /api/me/bookings: the member's own bookings, paged.
 * upcoming = true -> active bookings of classes that haven't started (soonest first);
 * upcoming = false -> every booking, any status (newest first).
 */
export async function getMyBookings(params: {
  upcoming: boolean;
  page: number;
  pageSize: number;
}): Promise<MyBookingItemPagedResult> {
  const response = await apiClient.get<MyBookingItemPagedResult>("/api/me/bookings", { params });
  return response.data;
}

/**
 * POST /api/me/bookings: books a class for the logged-in member.
 * 409 errors explain why not: Session.Full, Booking.AlreadyBooked, Booking.NoValidMembership,
 * Booking.MemberBusy (another class at the same time), Booking.SessionNotBookable (already started).
 */
export async function bookSession(sessionId: number): Promise<BookingResponse> {
  const response = await apiClient.post<BookingResponse>("/api/me/bookings", { sessionId });
  return response.data;
}

/** POST /api/me/bookings/{id}/cancel. 409 Booking.CancellationDeadlinePassed close to the start. */
export async function cancelMyBooking(id: number): Promise<void> {
  await apiClient.post(`/api/me/bookings/${id}/cancel`);
}

/** GET /api/me/qr: the member's personal check-in code (created on first use). */
export async function getMyQrCode(): Promise<CheckInCodeResponse> {
  const response = await apiClient.get<CheckInCodeResponse>("/api/me/qr");
  return response.data;
}

/** POST /api/me/qr/regenerate: a new code; the old one stops working at once. */
export async function regenerateMyQrCode(): Promise<CheckInCodeResponse> {
  const response = await apiClient.post<CheckInCodeResponse>("/api/me/qr/regenerate");
  return response.data;
}
