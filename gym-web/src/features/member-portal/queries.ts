import { useQuery } from "@tanstack/react-query";
import { getMyMemberships, getMyProfile } from "@/features/member-portal/api";

export const memberPortalKeys = {
  all: ["member-portal"] as const,
  profile: () => [...memberPortalKeys.all, "profile"] as const,
  memberships: () => [...memberPortalKeys.all, "memberships"] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: memberPortalKeys.profile(), queryFn: getMyProfile });
}

export function useMyMemberships() {
  return useQuery({ queryKey: memberPortalKeys.memberships(), queryFn: getMyMemberships });
}
