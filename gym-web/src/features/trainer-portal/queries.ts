import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getMySessionBookings,
  getMySessions,
  getMyTrainerProfile,
  getSession,
  markBookingAttended,
} from "@/features/trainer-portal/api";
import type { SessionBookingItem, SessionState } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many recent completed classes the attendance-rate tile looks at. */
export const RECENT_CLASSES = 10;

export const trainerPortalKeys = {
  all: ["trainer-portal"] as const,
  profile: () => [...trainerPortalKeys.all, "profile"] as const,
  lists: () => [...trainerPortalKeys.all, "list"] as const,
  // Keyed by the Cairo day, so the window moves forward by itself after midnight.
  week: (todayKey: string) => [...trainerPortalKeys.lists(), "week", todayKey] as const,
  history: (state: SessionState, page: number, pageSize: number) =>
    [...trainerPortalKeys.lists(), "history", { state, page, pageSize }] as const,
  session: (id: number) => [...trainerPortalKeys.all, "session", id] as const,
  roster: (id: number) => [...trainerPortalKeys.session(id), "roster"] as const,
};

export function useMyTrainerProfile() {
  return useQuery({
    queryKey: trainerPortalKeys.profile(),
    queryFn: getMyTrainerProfile,
    staleTime: 5 * 60_000,
  });
}

/**
 * Every class of mine (any state) from yesterday to 8 days ahead, soonest first: one request feeds
 * the "today", "happening now" and "this week" sections. The page groups them by Cairo day.
 * `todayKey` is null until the browser knows the time (see useNow), so the query waits for it.
 */
export function useMyWeek(todayKey: string | null) {
  return useQuery({
    queryKey: trainerPortalKeys.week(todayKey ?? ""),
    queryFn: () => {
      // A wide window (24h back, 8 days ahead) so no class is missed at the day edges in Cairo.
      const now = Date.now();
      return getMySessions({
        from: new Date(now - DAY_MS).toISOString(),
        to: new Date(now + 8 * DAY_MS).toISOString(),
        pageSize: 100, // the API's maximum: far more than one trainer teaches in a week
      });
    },
    enabled: todayKey !== null,
    // Bookings change while the page is open (members book from their phones).
    refetchInterval: 60_000,
  });
}

/** One page of past classes (Completed or Cancelled), newest first. */
export function useMyHistory(state: SessionState, page: number, pageSize = 10) {
  return useQuery({
    queryKey: trainerPortalKeys.history(state, page, pageSize),
    queryFn: () => getMySessions({ state, page, pageSize }),
    // Keep showing the old page while the next one loads (no flash of skeletons).
    placeholderData: keepPreviousData,
  });
}

/** One class, for the roster page header. */
export function useMySession(id: number) {
  return useQuery({
    queryKey: trainerPortalKeys.session(id),
    queryFn: () => getSession(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/** The members booked in one of my classes. */
export function useMyRoster(id: number, enabled = true) {
  return useQuery({
    queryKey: trainerPortalKeys.roster(id),
    queryFn: () => getMySessionBookings(id),
    enabled: enabled && Number.isInteger(id) && id > 0,
  });
}

/** Attended vs expected (booked or attended) for one roster. Cancelled bookings don't count. */
export function attendanceOf(bookings: SessionBookingItem[]) {
  const attended = bookings.filter((b) => b.status === "Attended").length;
  const expected = bookings.filter((b) => b.status !== "Cancelled").length;
  return { attended, expected };
}

/**
 * Attendance rate over my last completed classes. The class list has no attendance numbers, so we
 * read each class's roster (same cache as the roster page) and add them up. Past rosters can't
 * change any more, so they stay fresh for 5 minutes.
 */
export function useRecentAttendance() {
  const recent = useQuery({
    queryKey: trainerPortalKeys.history("Completed", 1, RECENT_CLASSES),
    queryFn: () => getMySessions({ state: "Completed", page: 1, pageSize: RECENT_CLASSES }),
  });
  const sessions = recent.data?.items ?? [];

  const rosters = useQueries({
    queries: sessions.map((s) => ({
      queryKey: trainerPortalKeys.roster(s.id),
      queryFn: () => getMySessionBookings(s.id),
      staleTime: 5 * 60_000,
    })),
  });

  const isPending = recent.isPending || rosters.some((r) => r.isPending);
  const isError = recent.isError || rosters.some((r) => r.isError);
  let attended = 0;
  let expected = 0;
  for (const roster of rosters) {
    if (!roster.data) continue;
    const counts = attendanceOf(roster.data);
    attended += counts.attended;
    expected += counts.expected;
  }

  return { isPending, isError, classes: sessions.length, attended, expected };
}

/** Marks one booking attended, then reloads the roster and my lists so every count updates. */
export function useMarkAttended(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booking: SessionBookingItem) => markBookingAttended(booking.bookingId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: trainerPortalKeys.roster(sessionId) }),
        queryClient.invalidateQueries({ queryKey: trainerPortalKeys.lists() }),
      ]),
  });
}
