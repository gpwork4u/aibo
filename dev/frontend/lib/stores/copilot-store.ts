"use client";

/**
 * Copilot zustand store
 *
 * - 跨路由保持狀態（store 在 module scope，不受 component unmount 影響）
 * - sendMessage：樂觀顯示 user message，POST 後等待 SSE stream 填充 assistant message
 * - clearSession：清空訊息、重置 sessionId
 */

import { create } from "zustand";
import { createSession, postMessage } from "@/lib/api/copilot";
import { ApiError } from "@/lib/api/client";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** streaming 中的 assistant message 是否尚未完成 */
  isStreaming?: boolean;
}

export interface CopilotStore {
  isOpen: boolean;
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  /** SSE 錯誤訊息（顯示在 InputArea 底部） */
  error: string | null;
  open(): void;
  close(): void;
  sendMessage(content: string): Promise<void>;
  clearSession(): void;
  /** 由 useCopilotSSE hook 呼叫，逐字 append assistant message */
  appendStreamToken(token: string): void;
  /** 由 useCopilotSSE hook 呼叫，結束 streaming */
  finishStreaming(): void;
  /** 由 useCopilotSSE hook 呼叫，截斷 streaming（Panel 關閉時） */
  abortStreaming(): void;
  /** 清除 error */
  clearError(): void;
}

let _msgCounter = 0;
function nextId() {
  return `local-${++_msgCounter}-${Date.now()}`;
}

export const useCopilotStore = create<CopilotStore>((set, get) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  isStreaming: false,
  error: null,

  open() {
    set({ isOpen: true });
  },

  close() {
    const { isStreaming } = get();
    if (isStreaming) {
      // 截斷 streaming 中的訊息，標示 "..."
      set((state) => ({
        isOpen: false,
        isStreaming: false,
        messages: state.messages.map((m) =>
          m.isStreaming ? { ...m, content: m.content + "...", isStreaming: false } : m,
        ),
      }));
    } else {
      set({ isOpen: false });
    }
  },

  async sendMessage(content: string) {
    const { isStreaming } = get();
    if (isStreaming) return;

    // 樂觀顯示 user message
    const userMsg: Message = { id: nextId(), role: "user", content };
    // placeholder assistant message（streaming）
    const assistantMsg: Message = {
      id: nextId(),
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    set((state) => ({
      messages: [...state.messages, userMsg, assistantMsg],
      isStreaming: true,
      error: null,
    }));

    try {
      // 確保 session 存在
      let { sessionId } = get();
      if (!sessionId) {
        const session = await createSession();
        sessionId = session.id;
        set({ sessionId });
      }

      await postMessage({ session_id: sessionId, content });
      // SSE stream 接管後續 assistant message append（由 useCopilotSSE 處理）
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const msg =
        status === 503
          ? "Copilot unavailable, please try again"
          : "Copilot unavailable, please try again";

      set((state) => ({
        isStreaming: false,
        error: msg,
        messages: state.messages.map((m) =>
          m.isStreaming ? { ...m, content: m.content || "", isStreaming: false } : m,
        ),
      }));
    }
  },

  clearSession() {
    set({ messages: [], sessionId: null, isStreaming: false, error: null });
  },

  appendStreamToken(token: string) {
    set((state) => {
      const msgs = [...state.messages];
      // 找最後一個 isStreaming 的 assistant message
      const idx = msgs.findLastIndex((m) => m.role === "assistant" && m.isStreaming);
      if (idx === -1) return {};
      msgs[idx] = { ...msgs[idx], content: msgs[idx].content + token };
      return { messages: msgs };
    });
  },

  finishStreaming() {
    set((state) => ({
      isStreaming: false,
      messages: state.messages.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m,
      ),
    }));
  },

  abortStreaming() {
    set((state) => ({
      isStreaming: false,
      messages: state.messages.map((m) =>
        m.isStreaming
          ? { ...m, content: m.content + "...", isStreaming: false }
          : m,
      ),
    }));
  },

  clearError() {
    set({ error: null });
  },
}));
