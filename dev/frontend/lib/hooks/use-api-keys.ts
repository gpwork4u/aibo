"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiKey,
  CreateApiKeyPayload,
  CreateApiKeyResponse,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/api/api-keys";

export const API_KEYS_QUERY_KEY = ["api-keys"] as const;

export function useApiKeysQuery() {
  return useQuery<ApiKey[]>({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: listApiKeys,
  });
}

export function useCreateApiKeyMutation() {
  const qc = useQueryClient();
  return useMutation<CreateApiKeyResponse, Error, CreateApiKeyPayload>({
    mutationFn: createApiKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}

export function useRevokeApiKeyMutation() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}
