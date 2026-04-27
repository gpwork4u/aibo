/**
 * GitHub 整合 API client
 *
 * 對應後端 F-034a 的 /api/v1/integrations/github/* 端點
 * 422 → GITHUB_TOKEN_INVALID / GITHUB_TOKEN_INSUFFICIENT_SCOPE
 * 403 → 權限不足（insufficient scope）
 * 503 → GITHUB_UNAVAILABLE
 */

import { apiClient, ApiError } from "./client";

// ─── 型別定義 ────────────────────────────────────────────────

/** GitHub 整合狀態（GET /api/v1/integrations/github/status 的回應） */
export interface GithubStatus {
  /** 是否已連接（true = 已設定 PAT） */
  connected: boolean;
  /** 已連接時的 GitHub 登入帳號名稱 */
  username?: string | null;
  /** 已驗證的 scopes 清單 */
  scopes?: string[] | null;
  /** 最後同步時間（ISO 8601） */
  last_synced_at?: string | null;
  /** 最後一次錯誤訊息 */
  last_error?: string | null;
}

/** 連接 GitHub 的請求 body */
export interface ConnectGithubInput {
  token: string;
}

/** 連接成功的回應 */
export interface ConnectGithubResponse {
  username: string;
  scopes: string[];
}

// ─── 錯誤碼對應 ───────────────────────────────────────────────

/**
 * 將後端錯誤碼轉為使用者友善的中文訊息
 * 後端錯誤 body 預期格式：{ code: string, message: string }
 */
export function formatGithubError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : "未知錯誤";
  }

  // 嘗試讀取後端 error code
  const body = err.body as Record<string, unknown> | null | undefined;
  const code = body && typeof body === "object" ? String(body.code ?? "") : "";

  switch (code) {
    case "GITHUB_TOKEN_INVALID":
      return "PAT 無效，請確認 token 是否正確";
    case "GITHUB_TOKEN_INSUFFICIENT_SCOPE":
      return "PAT 缺少必要權限：repo, read:user";
    case "GITHUB_UNAVAILABLE":
      return "GitHub 服務暫時無法連線，請稍後再試";
    default:
      // 依 HTTP status 給友善訊息
      if (err.status === 422) return "PAT 無效，請確認 token 是否正確";
      if (err.status === 403) return "PAT 缺少必要權限：repo, read:user";
      if (err.status === 503) return "GitHub 服務暫時無法連線，請稍後再試";
      return err.message || "操作失敗，請稍後再試";
  }
}

// ─── API 函式 ─────────────────────────────────────────────────

/**
 * 連接 GitHub — POST /api/v1/integrations/github/connect
 * @param token Personal Access Token
 */
export async function connectGithub(token: string): Promise<ConnectGithubResponse> {
  return apiClient.post<ConnectGithubResponse>("/api/v1/integrations/github/connect", {
    token,
  } satisfies ConnectGithubInput);
}

/**
 * 取得 GitHub 整合狀態 — GET /api/v1/integrations/github/status
 */
export async function getGithubStatus(): Promise<GithubStatus> {
  return apiClient.get<GithubStatus>("/api/v1/integrations/github/status");
}

/**
 * 中斷 GitHub 連接 — DELETE /api/v1/integrations/github
 */
export async function disconnectGithub(): Promise<void> {
  return apiClient.delete<void>("/api/v1/integrations/github");
}
