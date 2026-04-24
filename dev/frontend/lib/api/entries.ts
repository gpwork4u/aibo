import { apiClient } from "./client";
import type { Category } from "./categories";

export type { Category };

export interface Entry {
  id: string;
  title: string | null;
  content: string | null;
  category_id: string | null;
  domains: string[];
  context: string | null;
  tags: string[];
  is_archived: boolean;
  confidence: number;
  confirmations: number;
  flags_count: number;
  superseded_by: string | null;
  lifecycle_status: string | null;
  summary: string | null;
  detail: string | null;
  action: string | null;
  source: string | null;
  source_type: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntryListItem {
  id: string;
  title: string | null;
  content_preview: string | null;
  category_id: string | null;
  domains: string[];
  tags: string[];
  is_archived: boolean;
  confidence: number;
  confirmations: number;
  flags_count: number;
  lifecycle_status: string | null;
  source_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ListEntriesResponse {
  data: EntryListItem[];
  pagination: Pagination;
}

/** Alias kept for backwards compatibility with earlier naming. */
export type EntryListResponse = ListEntriesResponse;

export interface ListEntriesParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  category_id?: string;
  is_archived?: boolean;
  tags?: string[];
}

export interface CreateEntryInput {
  title?: string | null;
  content?: string | null;
  category_id?: string | null;
  tags?: string[];
  domains?: string[];
  context?: string | null;
  summary?: string | null;
  detail?: string | null;
  action?: string | null;
  source?: string | null;
  source_type?: string | null;
  source_ref?: string | null;
}

export interface UpdateEntryInput {
  title?: string | null;
  content?: string | null;
  category_id?: string | null;
  tags?: string[];
  domains?: string[];
  context?: string | null;
  summary?: string | null;
  detail?: string | null;
  action?: string | null;
  source?: string | null;
  source_type?: string | null;
  source_ref?: string | null;
  is_archived?: boolean;
}

function buildQuery(params: ListEntriesParams): string {
  const sp = new URLSearchParams();
  if (params.page !== undefined) sp.set("page", String(params.page));
  if (params.per_page !== undefined) sp.set("per_page", String(params.per_page));
  if (params.search) sp.set("search", params.search);
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  if (params.category_id !== undefined) sp.set("category_id", params.category_id);
  if (params.is_archived !== undefined) sp.set("is_archived", String(params.is_archived));
  if (params.tags && params.tags.length > 0) sp.set("tags", params.tags.join(","));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function listEntries(
  params: ListEntriesParams = {},
): Promise<ListEntriesResponse> {
  return apiClient.get<ListEntriesResponse>(`/api/v1/entries${buildQuery(params)}`);
}

export async function getEntry(id: string): Promise<Entry> {
  return apiClient.get<Entry>(`/api/v1/entries/${id}`);
}

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  return apiClient.post<Entry>("/api/v1/entries", input);
}

export async function updateEntry(id: string, input: UpdateEntryInput): Promise<Entry> {
  return apiClient.patch<Entry>(`/api/v1/entries/${id}`, input);
}

export async function deleteEntry(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/entries/${id}`);
}
