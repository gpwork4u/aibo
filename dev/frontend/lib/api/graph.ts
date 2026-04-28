/**
 * Graph API — GET /api/v1/graph
 * 回傳知識圖譜節點與邊，支援 ego network、過濾、分頁截斷。
 */
import { apiClient } from "@/lib/api/client";

export interface GraphNode {
  id: string;
  title: string;
  summary: string;
  category: { id: string; name: string } | null;
  confidence: number;
  status: string;
}

export interface GraphEdge {
  id: string;
  from_id: string;
  to_id: string;
  link_type: string;
  relation: string | null;
  confidence: number;
  source: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: {
    total_nodes: number;
    truncated: boolean;
  };
}

export interface GraphQueryParams {
  category_id?: string;
  link_types?: string;
  min_confidence?: number;
  limit?: number;
  entry_id?: string;
  depth?: number;
}

export async function fetchGraph(params: GraphQueryParams = {}): Promise<GraphResponse> {
  const qs = new URLSearchParams();
  if (params.category_id) qs.set("category_id", params.category_id);
  if (params.link_types) qs.set("link_types", params.link_types);
  if (params.min_confidence !== undefined) qs.set("min_confidence", String(params.min_confidence));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.entry_id) qs.set("entry_id", params.entry_id);
  if (params.depth !== undefined) qs.set("depth", String(params.depth));

  const path = `/api/v1/graph${qs.toString() ? `?${qs.toString()}` : ""}`;
  return apiClient.get<GraphResponse>(path);
}
