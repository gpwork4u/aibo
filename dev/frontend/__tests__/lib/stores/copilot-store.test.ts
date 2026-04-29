/**
 * Unit tests for copilot-store
 *
 * 測試 zustand store 的核心行為：
 * - open/close/clearSession
 * - appendStreamToken / finishStreaming / abortStreaming
 * - close 時截斷 streaming 訊息
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock API calls
vi.mock("@/lib/api/copilot", () => ({
  createSession: vi.fn().mockResolvedValue({ id: "session-1", created_at: "" }),
  postMessage: vi.fn().mockResolvedValue({
    id: "msg-1",
    session_id: "session-1",
    role: "user",
    content: "hello",
    created_at: "",
  }),
}));

import { useCopilotStore } from "@/lib/stores/copilot-store";

function getStore() {
  return useCopilotStore.getState();
}

function resetStore() {
  useCopilotStore.setState({
    isOpen: false,
    sessionId: null,
    messages: [],
    isStreaming: false,
    error: null,
  });
}

describe("CopilotStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("初始狀態正確", () => {
    const s = getStore();
    expect(s.isOpen).toBe(false);
    expect(s.sessionId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.isStreaming).toBe(false);
    expect(s.error).toBeNull();
  });

  it("open() 設定 isOpen = true", () => {
    getStore().open();
    expect(useCopilotStore.getState().isOpen).toBe(true);
  });

  it("close() 設定 isOpen = false（無 streaming）", () => {
    getStore().open();
    getStore().close();
    expect(useCopilotStore.getState().isOpen).toBe(false);
  });

  it("close() 截斷 streaming 中的訊息並加 '...'", () => {
    useCopilotStore.setState({
      isOpen: true,
      isStreaming: true,
      messages: [
        { id: "1", role: "user", content: "hi" },
        { id: "2", role: "assistant", content: "hell", isStreaming: true },
      ],
    });
    getStore().close();
    const s = useCopilotStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.isStreaming).toBe(false);
    expect(s.messages[1].content).toBe("hell...");
    expect(s.messages[1].isStreaming).toBe(false);
  });

  it("clearSession() 清空訊息和 sessionId", () => {
    useCopilotStore.setState({
      sessionId: "abc",
      messages: [{ id: "1", role: "user", content: "x" }],
      isStreaming: true,
    });
    getStore().clearSession();
    const s = useCopilotStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.sessionId).toBeNull();
    expect(s.isStreaming).toBe(false);
  });

  it("appendStreamToken() 追加 token 到最後一個 streaming assistant message", () => {
    useCopilotStore.setState({
      messages: [
        { id: "1", role: "user", content: "hi" },
        { id: "2", role: "assistant", content: "hell", isStreaming: true },
      ],
    });
    getStore().appendStreamToken("o");
    const msgs = useCopilotStore.getState().messages;
    expect(msgs[1].content).toBe("hello");
  });

  it("finishStreaming() 結束所有 isStreaming 狀態", () => {
    useCopilotStore.setState({
      isStreaming: true,
      messages: [
        { id: "2", role: "assistant", content: "hello", isStreaming: true },
      ],
    });
    getStore().finishStreaming();
    const s = useCopilotStore.getState();
    expect(s.isStreaming).toBe(false);
    expect(s.messages[0].isStreaming).toBe(false);
  });

  it("abortStreaming() 截斷並加 '...'", () => {
    useCopilotStore.setState({
      isStreaming: true,
      messages: [
        { id: "1", role: "assistant", content: "partial", isStreaming: true },
      ],
    });
    getStore().abortStreaming();
    const s = useCopilotStore.getState();
    expect(s.isStreaming).toBe(false);
    expect(s.messages[0].content).toBe("partial...");
  });

  it("clearError() 清除錯誤", () => {
    useCopilotStore.setState({ error: "some error" });
    getStore().clearError();
    expect(useCopilotStore.getState().error).toBeNull();
  });
});
