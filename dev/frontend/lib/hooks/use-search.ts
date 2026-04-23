"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { runSearch } from "@/lib/api/search";
import { SearchParams, SearchResponse } from "@/lib/schemas/search";

export const SEARCH_QUERY_KEY = "search";

/**
 * 搜尋 query hook。
 *
 * - `params.q` 為空字串時 query disabled，不會打 API。
 * - 使用 `keepPreviousData` 保留上一次結果，避免 UI 閃爍。
 */
export function useSearchQuery(params: SearchParams) {
  const trimmed = params.q.trim();
  return useQuery<SearchResponse>({
    queryKey: [
      SEARCH_QUERY_KEY,
      params.mode,
      trimmed,
      params.categoryId ?? null,
      params.tags ?? [],
      params.domains ?? [],
      params.limit ?? null,
      params.offset ?? 0,
    ],
    queryFn: ({ signal }) => runSearch({ ...params, q: trimmed }, signal),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
