"use client";

/**
 * useCopilotSSE — EventSource 連線管理
 *
 * - Panel 開啟時建立 EventSource 連線至 /api/v1/copilot/stream
 * - Panel 關閉時 es.close()
 * - onerror：最多 3 次指數退避重連（1s / 2s / 4s）
 * - event: message → appendStreamToken
 * - event: done    → finishStreaming
 * - event: error   → 重置 streaming 狀態
 * - event: ping    → 忽略（F-039 skeleton ping）
 */

import { useEffect, useRef } from "react";
import { useCopilotStore } from "@/lib/stores/copilot-store";

const SSE_URL = "/api/v1/copilot/stream";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export function useCopilotSSE() {
  const isOpen = useCopilotStore((s) => s.isOpen);
  const sessionId = useCopilotStore((s) => s.sessionId);
  const appendStreamToken = useCopilotStore((s) => s.appendStreamToken);
  const finishStreaming = useCopilotStore((s) => s.finishStreaming);
  const abortStreaming = useCopilotStore((s) => s.abortStreaming);
  const clearError = useCopilotStore((s) => s.clearError);

  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cleanup() {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  function connect(sessionId: string | null) {
    cleanup();
    const url = sessionId
      ? `${SSE_URL}?session_id=${encodeURIComponent(sessionId)}`
      : SSE_URL;

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.addEventListener("message", (e) => {
      retryCountRef.current = 0; // 成功收到資料，重置重試計數
      appendStreamToken(e.data);
    });

    es.addEventListener("done", () => {
      retryCountRef.current = 0;
      finishStreaming();
    });

    es.addEventListener("error", (e) => {
      // SSE server-sent error event
      console.error("[CopilotSSE] server error event", e);
      finishStreaming();
    });

    es.addEventListener("ping", () => {
      // 忽略 F-039 skeleton ping
    });

    es.onerror = () => {
      // 瀏覽器原生重連失敗（連線中斷）
      if (retryCountRef.current >= MAX_RETRIES) {
        console.warn("[CopilotSSE] max retries reached, giving up");
        cleanup();
        return;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
      retryCountRef.current++;

      console.warn(
        `[CopilotSSE] connection error, retry ${retryCountRef.current}/${MAX_RETRIES} in ${delay}ms`,
      );

      // 關閉舊連線，等待後重連
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      retryTimerRef.current = setTimeout(() => {
        // 只在 panel 仍然開啟時重連
        if (useCopilotStore.getState().isOpen) {
          connect(useCopilotStore.getState().sessionId);
        }
      }, delay);
    };
  }

  useEffect(() => {
    if (isOpen) {
      clearError();
      retryCountRef.current = 0;
      connect(sessionId);
    } else {
      // Panel 關閉：abort streaming + close EventSource
      if (esRef.current) {
        abortStreaming();
        cleanup();
      }
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // sessionId 變更時重新連線（清除 session 後新 session 建立）
  useEffect(() => {
    if (isOpen && sessionId) {
      retryCountRef.current = 0;
      connect(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
}
