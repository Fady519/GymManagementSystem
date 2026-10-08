import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bookSession,
  cancelMyBooking,
  getMyBookings,
  getMyMemberships,
  getMyProfile,
  getMyQrCode,
  regenerateMyQrCode,
} from "@/features/member-portal/api";
import { sessionKeys } from "@/features/sessions/queries";

export const memberPortalKeys = {
  all: ["member-portal"] as const,
  profile: () => [...memberPortalKeys.all, "profile"] as const,
  memberships: () => [...memberPortalKeys.all, "memberships"] as const,
  bookings: () => [...memberPortalKeys.all, "bookings"] as const,
  bookingList: (upcoming: boolean, page: number, pageSize: number) =>
    [...memberPortalKeys.bookings(), { upcoming, page, pageSize }] as const,
  qr: () => [...memberPortalKeys.all, "qr"] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: memberPortalKeys.profile(), queryFn: getMyProfile });
}

export function useMyMemberships() {
  return useQuery({ queryKey: memberPortalKeys.memberships(), queryFn: getMyMemberships });
}

/** A page of the member's bookings. The previous page stays on screen while the next one loads. */
export function useMyBookings(upcoming: boolean, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: memberPortalKeys.bookingList(upcoming, page, pageSize),
    queryFn: () => getMyBookings({ upcoming, page, pageSize }),
    placeholderData: keepPreviousData,
  });
}

export function useMyQrCode() {
  return useQuery({
    queryKey: memberPortalKeys.qr(),
    queryFn: getMyQrCode,
    // The code only changes when the member regenerates it, so there's no need to refetch it.
    staleTime: Infinity,
  });
}

export function useRegenerateQrCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regenerateMyQrCode,
    onSuccess: (code) => queryClient.setQueryData(memberPortalKeys.qr(), code),
  });
}

/**
 * Booking and cancelling change the free spots of the class and the member's bookings,
 * so both lists are refreshed afterwards (also when the request fails: the class may have
 * filled up in the meantime, and the member should see the real numbers).
 */
function useRefreshAfterBookingChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: memberPortalKeys.bookings() }),
      queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
    ]);
}

export function useBookSession() {
  const refresh = useRefreshAfterBookingChange();
  return useMutation({ mutationFn: bookSession, onSettled: refresh });
}

export function useCancelMyBooking() {
  const refresh = useRefreshAfterBookingChange();
  return useMutation({ mutationFn: cancelMyBooking, onSettled: refresh });
}
