import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/features/dashboard/queries";
import { memberKeys } from "@/features/members/queries";
import {
  attendBooking,
  cancelBooking,
  cancelSession,
  createBooking,
  createSession,
  deleteSession,
  getAvailableMembers,
  getSession,
  getSessionBookings,
  getSessions,
  getUpcomingSessions,
  updateSession,
  type SessionListParams,
} from "@/features/sessions/api";
import type {
  AvailableMemberItem,
  BookingStatus,
  SaveSessionRequest,
  SessionBookingItem,
  SessionResponse,
} from "@/types";

export const sessionKeys = {
  all: ["sessions"] as const,
  upcoming: (pageSize: number) => [...sessionKeys.all, "upcoming", { pageSize }] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (params: SessionListParams) => [...sessionKeys.lists(), params] as const,
  detail: (id: number) => [...sessionKeys.all, "detail", id] as const,
  bookings: (id: number) => [...sessionKeys.detail(id), "bookings"] as const,
  available: (id: number) => [...sessionKeys.detail(id), "available"] as const,
  availableSearch: (id: number, search: string) =>
    [...sessionKeys.available(id), { search }] as const,
};

/** The next few classes. `data.totalCount` is the number of all upcoming classes. */
export function useUpcomingSessions(pageSize = 3) {
  return useQuery({
    queryKey: sessionKeys.upcoming(pageSize),
    queryFn: () => getUpcomingSessions(pageSize),
  });
}

export function useSessions(params: SessionListParams, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => getSessions(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/**
 * One class. It refreshes every 30 seconds while the page is open, so "Upcoming" turns into
 * "Ongoing" (and the attendance buttons appear) without a manual reload.
 */
export function useSession(id: number, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => getSession(id),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useSessionBookings(id: number, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.bookings(id),
    queryFn: () => getSessionBookings(id),
    enabled,
  });
}

export function useAvailableMembers(id: number, search: string, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.availableSearch(id, search),
    queryFn: () => getAvailableMembers(id, search),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** After a class changes: every schedule view and the dashboard numbers are stale. */
async function refreshSessions(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useSaveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: SaveSessionRequest }) =>
      id ? updateSession(id, body) : createSession(body),
    onSuccess: async (session) => {
      queryClient.setQueryData(sessionKeys.detail(session.id), session);
      await refreshSessions(queryClient);
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelSession(id, reason),
    onSuccess: () => refreshSessions(queryClient),
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSession(id),
    onSuccess: async (_, id) => {
      // Refresh every other schedule view, but not the deleted class: its page is still open
      // until the redirect, and asking for it again would only return 404. Its cache entry is
      // dropped automatically once nothing uses it.
      const deleted = sessionKeys.detail(id);
      await queryClient.invalidateQueries({
        queryKey: sessionKeys.all,
        predicate: (query) => !deleted.every((part, i) => query.queryKey[i] === part),
      });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

// ---------- Bookings (optimistic) ----------
//
// "Optimistic" = we change the screen first, as if the server already said yes, so the seat
// count moves the moment the button is pressed. Before changing anything we save a copy of
// the cached data; if the server says no (class full, member busy...), we put the copy back
// and show the reason. Either way, at the end we refetch, so the screen matches the database.

type Snapshot = {
  session: SessionResponse | undefined;
  bookings: SessionBookingItem[] | undefined;
  available: [readonly unknown[], AvailableMemberItem[] | undefined][];
};

async function takeSnapshot(queryClient: QueryClient, sessionId: number): Promise<Snapshot> {
  // Stop requests in flight, so an old response can't overwrite our optimistic change.
  await queryClient.cancelQueries({ queryKey: sessionKeys.detail(sessionId) });
  return {
    session: queryClient.getQueryData<SessionResponse>(sessionKeys.detail(sessionId)),
    bookings: queryClient.getQueryData<SessionBookingItem[]>(sessionKeys.bookings(sessionId)),
    available: queryClient.getQueriesData<AvailableMemberItem[]>({
      queryKey: sessionKeys.available(sessionId),
    }),
  };
}

function restoreSnapshot(queryClient: QueryClient, sessionId: number, snapshot: Snapshot) {
  queryClient.setQueryData(sessionKeys.detail(sessionId), snapshot.session);
  queryClient.setQueryData(sessionKeys.bookings(sessionId), snapshot.bookings);
  for (const [key, data] of snapshot.available) queryClient.setQueryData(key, data);
}

/** Moves the seat counter by `delta` (+1 = one more seat taken). */
function moveSeats(queryClient: QueryClient, sessionId: number, delta: number) {
  queryClient.setQueryData<SessionResponse>(sessionKeys.detail(sessionId), (session) =>
    session
      ? {
          ...session,
          bookedCount: session.bookedCount + delta,
          availableSlots: session.availableSlots - delta,
        }
      : session,
  );
}

function setBookingStatus(
  queryClient: QueryClient,
  sessionId: number,
  bookingId: number,
  status: BookingStatus,
) {
  queryClient.setQueryData<SessionBookingItem[]>(sessionKeys.bookings(sessionId), (list) =>
    list?.map((b) => (b.bookingId === bookingId ? { ...b, status } : b)),
  );
}

async function settleBookings(queryClient: QueryClient, memberId: number) {
  await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  await queryClient.invalidateQueries({ queryKey: memberKeys.bookings(memberId) });
  await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useBookMember(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (member: AvailableMemberItem) => createBooking(sessionId, member.id),
    onMutate: async (member) => {
      const snapshot = await takeSnapshot(queryClient, sessionId);
      moveSeats(queryClient, sessionId, +1);
      // A temporary row (negative id) until the refetch brings the real booking.
      const pending: SessionBookingItem = {
        bookingId: -member.id,
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        status: "Booked",
        bookedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<SessionBookingItem[]>(sessionKeys.bookings(sessionId), (list) =>
        list ? [...list, pending] : list,
      );
      // They can't be booked twice, so they leave the "available" list right away.
      queryClient.setQueriesData<AvailableMemberItem[]>(
        { queryKey: sessionKeys.available(sessionId) },
        (list) => list?.filter((m) => m.id !== member.id),
      );
      return snapshot;
    },
    onError: (_error, _member, snapshot) => {
      if (snapshot) restoreSnapshot(queryClient, sessionId, snapshot);
    },
    onSettled: (_data, _error, member) => settleBookings(queryClient, member.id),
  });
}

export function useCancelBooking(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booking: SessionBookingItem) => cancelBooking(booking.bookingId),
    onMutate: async (booking) => {
      const snapshot = await takeSnapshot(queryClient, sessionId);
      moveSeats(queryClient, sessionId, -1);
      setBookingStatus(queryClient, sessionId, booking.bookingId, "Cancelled");
      return snapshot;
    },
    onError: (_error, _booking, snapshot) => {
      if (snapshot) restoreSnapshot(queryClient, sessionId, snapshot);
    },
    onSettled: (_data, _error, booking) => settleBookings(queryClient, booking.memberId),
  });
}

export function useAttendBooking(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booking: SessionBookingItem) => attendBooking(booking.bookingId),
    onMutate: async (booking) => {
      const snapshot = await takeSnapshot(queryClient, sessionId);
      // An attended booking still holds its seat, so the counter doesn't move.
      setBookingStatus(queryClient, sessionId, booking.bookingId, "Attended");
      return snapshot;
    },
    onError: (_error, _booking, snapshot) => {
      if (snapshot) restoreSnapshot(queryClient, sessionId, snapshot);
    },
    onSettled: (_data, _error, booking) => settleBookings(queryClient, booking.memberId),
  });
}
