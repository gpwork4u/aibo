import { apiClient } from "./client";

/** API Key（不含完整 key 值）。 */
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyListResponse {
  data: ApiKey[];
  total?: number;
}

export interface CreateApiKeyPayload {
  name: string;
  expires_at: string | null;
}

export interface CreateApiKeyResponse extends ApiKey {
  /** 完整 API Key 明文，僅在建立時回傳一次。 */
  key: string;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await apiClient.get<ApiKeyListResponse | ApiKey[]>("/api/v1/api-keys");
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

export async function createApiKey(
  payload: CreateApiKeyPayload,
): Promise<CreateApiKeyResponse> {
  return apiClient.post<CreateApiKeyResponse>("/api/v1/api-keys", payload);
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/api-keys/${encodeURIComponent(id)}`);
}
