import { useQuery } from "@tanstack/react-query";
import { getUpcomingSessions } from "@/features/sessions/api";

export const sessionKeys = {
  all: ["sessions"] as const,
  upcoming: (pageSize: number) => [...sessionKeys.all, "upcoming", { pageSize }] as const,
};

/** The next few classes. `data.totalCount` is the number of all upcoming classes. */
export function useUpcomingSessions(pageSize = 3) {
  return useQuery({
    queryKey: sessionKeys.upcoming(pageSize),
    queryFn: () => getUpcomingSessions(pageSize),
  });
}
