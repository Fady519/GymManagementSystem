import { apiClient } from "@/lib/api-client";
import type {
  SaveTrainerRequest,
  TrainerResponse,
  TrainerResponsePagedResult,
  TrainerWithAccountResponse,
} from "@/types";

export type TrainerListParams = {
  search: string;
  categoryId: number | null;
  page: number;
  pageSize: number;
};

/** GET /api/trainers (admin): sorted by name, searched and paged by the API. */
export async function getTrainers(params: TrainerListParams): Promise<TrainerResponsePagedResult> {
  const response = await apiClient.get<TrainerResponsePagedResult>("/api/trainers", {
    params: {
      search: params.search || undefined,
      categoryId: params.categoryId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return response.data;
}

/**
 * POST /api/trainers (admin). Also creates the trainer's login and emails them an invite to
 * choose a password. inviteSent = false means the email failed (they can be re-invited).
 */
export async function createTrainer(body: SaveTrainerRequest): Promise<TrainerWithAccountResponse> {
  const response = await apiClient.post<TrainerWithAccountResponse>("/api/trainers", body);
  return response.data;
}

/** PUT /api/trainers/{id} (admin). Their login's email and name are updated too. */
export async function updateTrainer(
  id: number,
  body: SaveTrainerRequest,
): Promise<TrainerResponse> {
  const response = await apiClient.put<TrainerResponse>(`/api/trainers/${id}`, body);
  return response.data;
}

/** DELETE /api/trainers/{id} (admin). Also disables their login. 409 while they have upcoming classes. */
export async function deleteTrainer(id: number): Promise<void> {
  await apiClient.delete(`/api/trainers/${id}`);
}

/** POST /api/trainers/{id}/account (admin): send (or resend) the invite. 409 once they set a password. */
export async function sendTrainerInvite(id: number): Promise<TrainerWithAccountResponse> {
  const response = await apiClient.post<TrainerWithAccountResponse>(`/api/trainers/${id}/account`);
  return response.data;
}
