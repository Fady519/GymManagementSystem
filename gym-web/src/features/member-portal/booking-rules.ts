import type { MembershipResponse, MyBookingItem, SessionResponse } from "@/types";

/**
 * Members can cancel a booking until this many hours before the class.
 * Same value as SessionRules:CancellationDeadlineHours in the API (appsettings.json).
 * The API still enforces it; this number is only used to show the deadline in advance.
 */
export const CANCELLATION_DEADLINE_HOURS = 2;

const HOUR_MS = 60 * 60 * 1000;

/** The last moment the member can cancel this booking online. */
export function cancelDeadline(booking: Pick<MyBookingItem, "sessionStartDate">): Date {
  return new Date(
    new Date(booking.sessionStartDate).getTime() - CANCELLATION_DEADLINE_HOURS * HOUR_MS,
  );
}

/**
 * Does one of the member's memberships cover the whole class?
 * The same rule the API checks when booking (BookingService): an active membership (or one that
 * starts later), or a frozen one whose freeze ends before the class, from start to end of the class.
 */
export function isCovered(
  memberships: MembershipResponse[],
  session: Pick<SessionResponse, "startDate" | "endDate">,
): boolean {
  const start = new Date(session.startDate).getTime();
  const end = new Date(session.endDate).getTime();

  return memberships.some((m) => {
    const usable =
      m.state === "Active" ||
      m.state === "Upcoming" ||
      (m.state === "Frozen" &&
        m.frozenUntil !== null &&
        new Date(m.frozenUntil).getTime() <= start);
    return (
      usable && new Date(m.startDate).getTime() <= start && new Date(m.endDate).getTime() >= end
    );
  });
}

/** True when the two time ranges overlap (used to warn about two classes at the same time). */
export function overlaps(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}
