"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkLlmProviderHealth,
  createLlmProvider,
  CreateLlmProviderInput,
  deleteLlmProvider,
  HealthCheckResponse,
  listLlmProviders,
  LlmProvider,
  updateLlmProvider,
  UpdateLlmProviderInput,
} from "@/lib/api/llm-providers";

export const LLM_PROVIDERS_QUERY_KEY = ["llm-providers"] as const;

export function useLlmProviders() {
  return useQuery<LlmProvider[]>({
    queryKey: LLM_PROVIDERS_QUERY_KEY,
    queryFn: listLlmProviders,
  });
}

export function useCreateLlmProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLlmProviderInput) => createLlmProvider(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LLM_PROVIDERS_QUERY_KEY });
    },
  });
}

export function useUpdateLlmProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLlmProviderInput }) =>
      updateLlmProvider(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LLM_PROVIDERS_QUERY_KEY });
    },
  });
}

export function useDeleteLlmProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLlmProvider(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LLM_PROVIDERS_QUERY_KEY });
    },
  });
}

export function useCheckLlmProviderHealth() {
  return useMutation<HealthCheckResponse, Error, string>({
    mutationFn: (id: string) => checkLlmProviderHealth(id),
  });
}
