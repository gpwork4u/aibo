import { apiClient } from "./client";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  entry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListCategoriesResponse {
  data: Category[];
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name: string;
  description?: string | null;
  sort_order: number;
}

export async function listCategories(): Promise<Category[]> {
  const res = await apiClient.get<ListCategoriesResponse>("/api/v1/categories");
  return res.data ?? [];
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return apiClient.post<Category>("/api/v1/categories", input);
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  return apiClient.put<Category>(`/api/v1/categories/${id}`, input);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/categories/${id}`);
}
