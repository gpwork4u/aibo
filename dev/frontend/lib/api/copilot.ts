/**
 * Copilot API fetcher
 * POST /api/v1/copilot/sessions  — 建立 session
 * POST /api/v1/copilot/message   — 送出訊息
 * GET  /api/v1/copilot/stream    — SSE 串流（由 useCopilotSSE hook 直接用 EventSource 開）
 */

import { apiClient } from "@/lib/api/client";

export interface CopilotSession {
  id: string;
  created_at: string;
}

export interface CopilotMessageRequest {
  session_id: string;
  content: string;
}

export interface CopilotMessageResponse {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ListMessagesResponse {
  messages: CopilotMessageResponse[];
}

export async function createSession(): Promise<CopilotSession> {
  return apiClient.post<CopilotSession>("/api/v1/copilot/sessions");
}

export async function postMessage(
  req: CopilotMessageRequest,
): Promise<CopilotMessageResponse> {
  return apiClient.post<CopilotMessageResponse>("/api/v1/copilot/message", req);
}

export async function listMessages(
  sessionId: string,
): Promise<ListMessagesResponse> {
  return apiClient.get<ListMessagesResponse>(
    `/api/v1/copilot/sessions/${sessionId}/messages`,
  );
}
