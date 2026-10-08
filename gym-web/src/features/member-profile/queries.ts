import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  deleteMyPhoto,
  saveMyHealthRecord,
  updateMyProfile,
  uploadMyPhoto,
} from "@/features/member-profile/api";
import { memberPortalKeys } from "@/features/member-portal/queries";
import type { HealthRecordDto, MemberResponse, UpdateMyProfileRequest } from "@/types";

/**
 * After a change we put what the API sent back straight into the cache (the page updates at once),
 * then mark the profile stale so every page that shows it (overview, header...) refetches.
 */
function updateProfileCache(
  queryClient: QueryClient,
  update: (profile: MemberResponse) => MemberResponse,
) {
  queryClient.setQueryData<MemberResponse>(memberPortalKeys.profile(), (profile) =>
    profile ? update(profile) : profile,
  );
  return queryClient.invalidateQueries({ queryKey: memberPortalKeys.profile() });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMyProfileRequest) => updateMyProfile(body),
    onSuccess: (member) => updateProfileCache(queryClient, () => member),
  });
}

export function useSaveMyHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: HealthRecordDto) => saveMyHealthRecord(body),
    onSuccess: (healthRecord) =>
      updateProfileCache(queryClient, (profile) => ({ ...profile, healthRecord })),
  });
}

export function useUploadMyPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadMyPhoto(file),
    onSuccess: (member) => updateProfileCache(queryClient, () => member),
  });
}

export function useDeleteMyPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMyPhoto,
    onSuccess: () => updateProfileCache(queryClient, (profile) => ({ ...profile, photoUrl: null })),
  });
}
