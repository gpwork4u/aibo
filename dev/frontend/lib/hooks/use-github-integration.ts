"use client";

/**
 * GitHub 整合 React Query hooks
 *
 * - useGithubStatus()      → 讀取連接狀態
 * - useConnectGithub()     → 連接（POST）
 * - useDisconnectGithub()  → 中斷連接（DELETE）
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectGithub,
  ConnectGithubResponse,
  disconnectGithub,
  getGithubStatus,
  GithubStatus,
} from "@/lib/api/github-integration";

/** React Query cache key */
export const GITHUB_STATUS_QUERY_KEY = ["github-status"] as const;

/**
 * 查詢 GitHub 整合狀態
 * 若後端 F-034a 尚未完成，fetch 失敗時 isError = true，UI 自然降級
 */
export function useGithubStatus() {
  return useQuery<GithubStatus>({
    queryKey: GITHUB_STATUS_QUERY_KEY,
    queryFn: getGithubStatus,
    // 避免過於頻繁重試，後端可能尚未就緒
    retry: 1,
  });
}

/**
 * 連接 GitHub PAT
 * 成功後自動 invalidate 狀態 query，觸發重新查詢
 */
export function useConnectGithub() {
  const qc = useQueryClient();
  return useMutation<ConnectGithubResponse, Error, string>({
    mutationFn: (token: string) => connectGithub(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GITHUB_STATUS_QUERY_KEY });
    },
  });
}

/**
 * 中斷 GitHub 連接
 * 成功後自動 invalidate 狀態 query
 */
export function useDisconnectGithub() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => disconnectGithub(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GITHUB_STATUS_QUERY_KEY });
    },
  });
}
