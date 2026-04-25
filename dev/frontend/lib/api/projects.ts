import { apiClient } from "./client";
import type { ProjectStatus } from "@/lib/projects/testids";

export type { ProjectStatus };

export interface TaskCounts {
  total: number;
  by_status: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  task_counts?: TaskCounts;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  color: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface PaginationResponse {
  page: number;
  per_page: number;
  total: number;
}

export interface ListProjectsResponse {
  data: ProjectListItem[];
  pagination: PaginationResponse;
}

export interface ListProjectsParams {
  status?: ProjectStatus | "all";
  page?: number;
  per_page?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  color?: string | null;
  status?: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
}

/**
 * UpdateProjectInput
 *
 * 後端使用 `**string` 區分「不更動」(undefined) 與「更新為 null」(null)。
 * 前端送出時：欄位省略 = 不更動；明確帶 null = 清空為 NULL。
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  color?: string;
  status?: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
}

function buildQuery(params: ListProjectsParams): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.page) sp.set("page", String(params.page));
  if (params.per_page) sp.set("per_page", String(params.per_page));
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function listProjects(
  params: ListProjectsParams = {},
): Promise<ListProjectsResponse> {
  return apiClient.get<ListProjectsResponse>(`/api/v1/projects${buildQuery(params)}`);
}

export async function getProject(id: string): Promise<Project> {
  return apiClient.get<Project>(`/api/v1/projects/${encodeURIComponent(id)}`);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return apiClient.post<Project>("/api/v1/projects", input);
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  return apiClient.patch<Project>(`/api/v1/projects/${encodeURIComponent(id)}`, input);
}

export async function deleteProject(
  id: string,
  force = false,
): Promise<void> {
  const qs = force ? "?force=true" : "";
  await apiClient.delete(`/api/v1/projects/${encodeURIComponent(id)}${qs}`);
}

export async function archiveProject(id: string): Promise<Project> {
  return apiClient.post<Project>(`/api/v1/projects/${encodeURIComponent(id)}/archive`);
}
