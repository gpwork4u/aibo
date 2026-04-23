import { apiClient } from "./client";
import {
  SearchParams,
  SearchResponse,
  searchResponseSchema,
} from "@/lib/schemas/search";

/**
 * 智慧搜尋（POST /api/v1/search）— 同義詞擴展 + ts_rank * confidence 排序。
 */
export async function smartSearch(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const body: Record<string, unknown> = {
    query: params.q,
  };
  if (params.categoryId) body.category_id = params.categoryId;
  if (params.domains && params.domains.length > 0) body.domains = params.domains;
  if (params.limit) body.limit = params.limit;

  const res = await apiClient.post<unknown>("/api/v1/search", body, { signal });
  return searchResponseSchema.parse(res);
}

/**
 * 簡單搜尋（GET /api/v1/search/simple）— 純 PostgreSQL full-text search。
 */
export async function simpleSearch(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  qs.set("q", params.q);
  if (params.categoryId) qs.set("category_id", params.categoryId);
  for (const tag of params.tags ?? []) qs.append("tag", tag);
  for (const domain of params.domains ?? []) qs.append("domain", domain);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));

  const res = await apiClient.get<unknown>(`/api/v1/search/simple?${qs.toString()}`, {
    signal,
  });
  return searchResponseSchema.parse(res);
}

/** 統一入口：依 mode 分派到 smart / simple。 */
export async function runSearch(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  if (params.mode === "smart") return smartSearch(params, signal);
  return simpleSearch(params, signal);
}
