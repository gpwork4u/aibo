import { z } from "zod";

/** 搜尋模式：智慧搜尋（含同義詞擴展）或簡單搜尋（純關鍵字）。 */
export type SearchMode = "smart" | "simple";

/** 單筆搜尋結果（合併 smart / simple response 的 shape）。 */
export const searchResultItemSchema = z.object({
  entry_id: z.string(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  content_preview: z.string().default(""),
  tags: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  context: z.unknown().nullable().optional(),
  lifecycle_status: z.string().default("active"),
  superseded_by: z.string().nullable().optional(),
  relevance: z.number().default(0),
  matched_keywords: z.array(z.string()).default([]).optional(),
});

export type SearchResultItem = z.infer<typeof searchResultItemSchema>;

/** 搜尋回應 — 同時涵蓋 smart / simple。 */
export const searchResponseSchema = z.object({
  results: z.array(searchResultItemSchema).default([]),
  total: z.number().default(0),
  degraded: z.boolean().default(false),
  synonyms_used: z.array(z.string()).default([]).optional(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

/** 搜尋參數（前端組合 UI state 用）。 */
export interface SearchParams {
  q: string;
  mode: SearchMode;
  categoryId?: string;
  tags?: string[];
  domains?: string[];
  limit?: number;
  offset?: number;
}
