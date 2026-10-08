import { useQuery } from "@tanstack/react-query";
import { getMyTrainerProfile, getMyUpcomingSessions } from "@/features/trainer-portal/api";

export const trainerPortalKeys = {
  all: ["trainer-portal"] as const,
  profile: () => [...trainerPortalKeys.all, "profile"] as const,
  upcoming: (pageSize: number) => [...trainerPortalKeys.all, "upcoming", { pageSize }] as const,
};

export function useMyTrainerProfile() {
  return useQuery({ queryKey: trainerPortalKeys.profile(), queryFn: getMyTrainerProfile });
}

/** My next classes. Refreshes every minute, so new bookings show up while the page is open. */
export function useMyUpcomingSessions(pageSize = 5) {
  return useQuery({
    queryKey: trainerPortalKeys.upcoming(pageSize),
    queryFn: () => getMyUpcomingSessions(pageSize),
    refetchInterval: 60_000,
  });
}
