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
  cancelMembership,
  createMembership,
  freezeMembership,
  getExpiringSoon,
  getMembership,
  getMemberships,
  renewMembership,
  unfreezeMembership,
  type MembershipListParams,
} from "@/features/memberships/api";
import { paymentKeys } from "@/features/payments/queries";
import { sessionKeys } from "@/features/sessions/queries";
import type {
  CancelMembershipRequest,
  CreateMembershipRequest,
  MembershipResponse,
  MembershipResponsePagedResult,
  RenewMembershipRequest,
} from "@/types";

export const membershipKeys = {
  all: ["memberships"] as const,
  lists: () => [...membershipKeys.all, "list"] as const,
  list: (params: MembershipListParams) => [...membershipKeys.lists(), params] as const,
  expiring: () => [...membershipKeys.all, "expiring"] as const,
  detail: (id: number) => [...membershipKeys.all, "detail", id] as const,
};

export function useMemberships(params: MembershipListParams) {
  return useQuery({
    queryKey: membershipKeys.list(params),
    queryFn: () => getMemberships(params),
    placeholderData: keepPreviousData,
  });
}

export function useExpiringSoon() {
  return useQuery({ queryKey: membershipKeys.expiring(), queryFn: getExpiringSoon });
}

export function useMembership(id: number | null) {
  return useQuery({
    queryKey: membershipKeys.detail(id ?? 0),
    queryFn: () => getMembership(id!),
    enabled: id !== null,
  });
}

/**
 * A membership change touches a lot of screens: the memberships lists, the member's profile
 * (status badge, memberships and payments tabs), the payments page, the dashboard numbers,
 * and who can book classes. We show the API's answer in the lists right away (so the new
 * status and end date appear instantly), then refetch everything that depends on it.
 */
async function applyChange(queryClient: QueryClient, changed: MembershipResponse) {
  queryClient.setQueriesData<MembershipResponsePagedResult>(
    { queryKey: membershipKeys.lists() },
    (page) =>
      page ? { ...page, items: page.items.map((m) => (m.id === changed.id ? changed : m)) } : page,
  );
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: membershipKeys.all }),
    queryClient.invalidateQueries({ queryKey: memberKeys.detail(changed.memberId) }),
    queryClient.invalidateQueries({ queryKey: memberKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  ]);
}

export function useCreateMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMembershipRequest) => createMembership(body),
    onSuccess: (membership) => applyChange(queryClient, membership),
  });
}

export function useRenewMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: RenewMembershipRequest }) =>
      renewMembership(id, body),
    onSuccess: (membership) => applyChange(queryClient, membership),
  });
}

export function useCancelMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CancelMembershipRequest }) =>
      cancelMembership(id, body),
    onSuccess: (membership) => applyChange(queryClient, membership),
  });
}

export function useFreezeMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days, reason }: { id: number; days: number; reason: string | null }) =>
      freezeMembership(id, { days, reason }),
    onSuccess: (membership) => applyChange(queryClient, membership),
  });
}

export function useUnfreezeMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unfreezeMembership(id),
    onSuccess: (membership) => applyChange(queryClient, membership),
  });
}
