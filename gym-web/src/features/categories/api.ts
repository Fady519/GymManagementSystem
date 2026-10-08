import { apiClient } from "@/lib/api-client";
import type { CategoryResponse, SaveCategoryRequest } from "@/types";

/** GET /api/categories: public list of class categories (programs), with how many trainers teach each. */
export async function getCategories(): Promise<CategoryResponse[]> {
  const response = await apiClient.get<CategoryResponse[]>("/api/categories");
  return response.data;
}

/** POST /api/categories (admin). 409 Category.NameTaken if the name is used. */
export async function createCategory(body: SaveCategoryRequest): Promise<CategoryResponse> {
  const response = await apiClient.post<CategoryResponse>("/api/categories", body);
  return response.data;
}

/** PUT /api/categories/{id} (admin): rename. */
export async function updateCategory(
  id: number,
  body: SaveCategoryRequest,
): Promise<CategoryResponse> {
  const response = await apiClient.put<CategoryResponse>(`/api/categories/${id}`, body);
  return response.data;
}

/** DELETE /api/categories/{id} (admin). 409 while trainers or upcoming classes use it. */
export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/api/categories/${id}`);
}
