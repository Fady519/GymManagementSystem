import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdmin,
  getUsers,
  resendUserInvite,
  setUserStatus,
  type UserListParams,
} from "@/features/users/api";
import type { CreateAdminRequest } from "@/types";

export const userKeys = {
  all: ["users"] as const,
  /** Every filter is part of the key, so each page/search is cached separately. */
  list: (params: UserListParams) => [...userKeys.all, "list", params] as const,
};

/** `enabled` is false for anyone who is not a Super admin, so we never call an endpoint that answers 403. */
export function useUsers(params: UserListParams, enabled: boolean) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    enabled,
    // Keep showing the current page while the next one loads, instead of flashing skeletons.
    placeholderData: keepPreviousData,
  });
}

function useRefreshUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all });
}

export function useCreateAdmin() {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: (body: CreateAdminRequest) => createAdmin(body),
    onSuccess: refresh,
  });
}

export function useResendUserInvite() {
  return useMutation({ mutationFn: (id: number) => resendUserInvite(id) });
}

export function useSetUserStatus() {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setUserStatus(id, isActive),
    onSuccess: refresh,
  });
}
