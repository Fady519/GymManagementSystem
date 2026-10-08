import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/features/dashboard/queries";
import {
  createMember,
  deleteMember,
  deleteMemberPhoto,
  getMember,
  getMemberBookings,
  getMemberMemberships,
  getMemberPayments,
  getMembers,
  saveHealthRecord,
  sendMemberInvite,
  updateMember,
  uploadMemberPhoto,
  type MemberBookingsParams,
  type MemberListParams,
} from "@/features/members/api";
import type {
  CreateMemberRequest,
  HealthRecordDto,
  MemberResponse,
  UpdateMemberRequest,
} from "@/types";

export const memberKeys = {
  all: ["members"] as const,
  lists: () => [...memberKeys.all, "list"] as const,
  list: (params: MemberListParams) => [...memberKeys.lists(), params] as const,
  detail: (id: number) => [...memberKeys.all, "detail", id] as const,
  payments: (id: number) => [...memberKeys.detail(id), "payments"] as const,
  memberships: (id: number) => [...memberKeys.detail(id), "memberships"] as const,
  bookings: (id: number) => [...memberKeys.detail(id), "bookings"] as const,
};

export function useMembers(params: MemberListParams) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => getMembers(params),
    // Keep showing the current page while the next one loads, instead of flashing skeletons.
    placeholderData: keepPreviousData,
  });
}

/** enabled = false skips the request (e.g. the id in the URL isn't a number). */
export function useMember(id: number, enabled = true) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => getMember(id),
    enabled,
  });
}

export function useMemberPayments(id: number) {
  return useQuery({ queryKey: memberKeys.payments(id), queryFn: () => getMemberPayments(id) });
}

export function useMemberMemberships(id: number) {
  return useQuery({
    queryKey: memberKeys.memberships(id),
    queryFn: () => getMemberMemberships(id),
  });
}

export function useMemberBookings(id: number, params: MemberBookingsParams) {
  return useQuery({
    queryKey: [...memberKeys.bookings(id), params],
    queryFn: () => getMemberBookings(id, params),
    placeholderData: keepPreviousData,
  });
}

/**
 * After a change we already have the updated member from the response, so we put it straight
 * into the cache (no extra request for the details page) and mark the lists as stale.
 */
function storeMember(queryClient: QueryClient, member: MemberResponse) {
  queryClient.setQueryData(memberKeys.detail(member.id), member);
  return queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMemberRequest) => createMember(body),
    onSuccess: async (member) => {
      await storeMember(queryClient, member);
      // The dashboard's "total members" number changed too.
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateMemberRequest }) => updateMember(id, body),
    onSuccess: (member) => storeMember(queryClient, member),
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMember(id),
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: memberKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useSaveHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: HealthRecordDto }) => saveHealthRecord(id, body),
    onSuccess: (healthRecord, { id }) =>
      queryClient.setQueryData<MemberResponse>(memberKeys.detail(id), (member) =>
        member ? { ...member, healthRecord } : member,
      ),
  });
}

export function useUploadMemberPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadMemberPhoto(id, file),
    onSuccess: (member) => storeMember(queryClient, member),
  });
}

export function useDeleteMemberPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMemberPhoto(id),
    onSuccess: async (_, id) => {
      queryClient.setQueryData<MemberResponse>(memberKeys.detail(id), (member) =>
        member ? { ...member, photoUrl: null } : member,
      );
      await queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useSendMemberInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sendMemberInvite(id),
    onSuccess: (result) => storeMember(queryClient, result.member),
  });
}
