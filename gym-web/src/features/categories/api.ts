import { apiClient } from "@/lib/api-client";
import type { CategoryResponse } from "@/types";

/** GET /api/categories: public list of class categories (programs), with how many trainers teach each. */
export async function getCategories(): Promise<CategoryResponse[]> {
  const response = await apiClient.get<CategoryResponse[]>("/api/categories");
  return response.data;
}
