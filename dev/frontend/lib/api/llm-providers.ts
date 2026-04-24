import { apiClient } from "./client";

export interface LlmProviderConfig {
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
  [key: string]: unknown;
}

export interface LlmProvider {
  id: string;
  name: string;
  endpoint_url: string;
  api_key_set: boolean;
  model_name: string;
  is_default: boolean;
  config: LlmProviderConfig | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListLlmProvidersResponse {
  data: LlmProvider[];
}

export interface CreateLlmProviderInput {
  name: string;
  endpoint_url: string;
  api_key?: string | null;
  model_name: string;
  is_default?: boolean;
  is_active?: boolean;
  config?: LlmProviderConfig | null;
}

export interface UpdateLlmProviderInput {
  name: string;
  endpoint_url: string;
  /** 若未提供則後端保持原值；null 代表清除 */
  api_key?: string | null;
  model_name: string;
  is_default: boolean;
  is_active: boolean;
  config?: LlmProviderConfig | null;
}

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  response_time_ms?: number;
  error?: string;
}

export async function listLlmProviders(): Promise<LlmProvider[]> {
  const res = await apiClient.get<ListLlmProvidersResponse>("/api/v1/llm-providers");
  return res.data ?? [];
}

export async function createLlmProvider(input: CreateLlmProviderInput): Promise<LlmProvider> {
  return apiClient.post<LlmProvider>("/api/v1/llm-providers", input);
}

export async function updateLlmProvider(
  id: string,
  input: UpdateLlmProviderInput,
): Promise<LlmProvider> {
  return apiClient.put<LlmProvider>(`/api/v1/llm-providers/${id}`, input);
}

export async function deleteLlmProvider(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/llm-providers/${id}`);
}

export async function checkLlmProviderHealth(id: string): Promise<HealthCheckResponse> {
  return apiClient.post<HealthCheckResponse>(`/api/v1/llm-providers/${id}/health`);
}
