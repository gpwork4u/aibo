/**
 * Unit tests for useCopilotSSE
 *
 * 使用 mock EventSource 驗證：
 * - Panel 開啟時建立連線
 * - Panel 關閉時 close() 呼叫
 * - message / done / error events 觸發正確 store action
 * - 連線錯誤時觸發指數退避重連（最多 3 次）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCopilotSSE } from "@/lib/hooks/use-copilot-sse";
import { useCopilotStore } from "@/lib/stores/copilot-store";

// ──────────────────────────────────────────────────────────────────
// Mock EventSource
// ──────────────────────────────────────────────────────────────────

type EventHandler = (e: { data?: string }) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  withCredentials: boolean;
  onerror: (() => void) | null = null;
  private listeners: Record<string, EventHandler[]> = {};
  closed = false;

  constructor(url: string, opts?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = opts?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, handler: EventHandler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  /** 測試輔助：模擬 server-sent event */
  emit(event: string, data?: string) {
    const handlers = this.listeners[event] ?? [];
    handlers.forEach((h) => h({ data }));
  }

  /** 模擬連線錯誤 */
  triggerError() {
    this.onerror?.();
  }

  close() {
    this.closed = true;
  }
}

vi.stubGlobal("EventSource", MockEventSource);

// ──────────────────────────────────────────────────────────────────

function resetStore() {
  useCopilotStore.setState({
    isOpen: false,
    sessionId: null,
    messages: [],
    isStreaming: false,
    error: null,
  });
}

describe("useCopilotSSE", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it("Panel 開啟時建立 EventSource 連線", () => {
    act(() => useCopilotStore.setState({ isOpen: true }));
    renderHook(() => useCopilotSSE());
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toContain("/api/v1/copilot/stream");
  });

  it("Panel 關閉時 EventSource.close() 被呼叫", () => {
    act(() => useCopilotStore.setState({ isOpen: true }));
    const { rerender } = renderHook(() => useCopilotSSE());
    const es = MockEventSource.instances[0];

    act(() => useCopilotStore.getState().close());
    rerender();

    expect(es.closed).toBe(true);
  });

  it("message event 觸發 appendStreamToken", () => {
    const appendStreamToken = vi.spyOn(
      useCopilotStore.getState(),
      "appendStreamToken",
    );
    // 加入 streaming assistant 訊息
    useCopilotStore.setState({
      isOpen: true,
      isStreaming: true,
      messages: [{ id: "a1", role: "assistant", content: "", isStreaming: true }],
    });

    renderHook(() => useCopilotSSE());
    const es = MockEventSource.instances[0];

    act(() => es.emit("message", "hello"));
    // appendStreamToken 在 store 中直接更新 state，驗證 content
    const msgs = useCopilotStore.getState().messages;
    expect(msgs[0].content).toBe("hello");
  });

  it("done event 觸發 finishStreaming", () => {
    useCopilotStore.setState({ isOpen: true, isStreaming: true });
    renderHook(() => useCopilotSSE());
    const es = MockEventSource.instances[0];

    act(() => es.emit("done"));
    expect(useCopilotStore.getState().isStreaming).toBe(false);
  });

  it("連線錯誤時最多重試 3 次（指數退避）", () => {
    useCopilotStore.setState({ isOpen: true });
    renderHook(() => useCopilotSSE());

    // 第一次錯誤 → retry 1（1s delay）
    act(() => MockEventSource.instances.at(-1)!.triggerError());
    expect(MockEventSource.instances.length).toBe(1); // 尚未重連

    act(() => vi.advanceTimersByTime(1000));
    expect(MockEventSource.instances.length).toBe(2);

    // 第二次錯誤 → retry 2（2s delay）
    act(() => MockEventSource.instances.at(-1)!.triggerError());
    act(() => vi.advanceTimersByTime(2000));
    expect(MockEventSource.instances.length).toBe(3);

    // 第三次錯誤 → retry 3（4s delay）
    act(() => MockEventSource.instances.at(-1)!.triggerError());
    act(() => vi.advanceTimersByTime(4000));
    expect(MockEventSource.instances.length).toBe(4);

    // 第四次錯誤 → 超過 max retries，不再重連
    act(() => MockEventSource.instances.at(-1)!.triggerError());
    act(() => vi.advanceTimersByTime(10000));
    expect(MockEventSource.instances.length).toBe(4); // 沒有新連線
  });
});
