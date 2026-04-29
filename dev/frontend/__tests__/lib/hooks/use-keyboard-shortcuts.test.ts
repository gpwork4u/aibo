/**
 * useKeyboardShortcuts 單元測試
 *
 * 測試：
 * - G+I 500ms 內導航至 /inbox
 * - G+L 導航至 /library
 * - G+T 導航至 /today
 * - G+C 導航至 /canvas
 * - G+S 導航至 /settings
 * - G 系列超過 500ms 不觸發
 * - ? 開啟 ShortcutsModal
 * - input focus 中字母快捷鍵不觸發
 * - ⌘K 不受 input focus 影響
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useCmdk
const mockToggleCmdk = vi.fn();
vi.mock("@/components/cmdk/cmdk-provider", () => ({
  useCmdk: () => ({ open: false, setOpen: vi.fn(), toggle: mockToggleCmdk }),
}));

import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers });
  window.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  const onOpenShortcutsModal = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
    mockToggleCmdk.mockClear();
    onOpenShortcutsModal.mockClear();
    // 確保 activeElement 不是 input
    Object.defineProperty(document, "activeElement", {
      value: document.body,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    return renderHook(() => useKeyboardShortcuts({ onOpenShortcutsModal }));
  }

  it("G+I 500ms 內導航至 /inbox", () => {
    setup();

    act(() => {
      fireKey("g");
      vi.advanceTimersByTime(200);
      fireKey("i");
    });

    expect(mockPush).toHaveBeenCalledWith("/inbox");
  });

  it("G+L 導航至 /library", () => {
    setup();

    act(() => {
      fireKey("g");
      vi.advanceTimersByTime(100);
      fireKey("l");
    });

    expect(mockPush).toHaveBeenCalledWith("/library");
  });

  it("G+T 導航至 /today", () => {
    setup();

    act(() => {
      fireKey("g");
      vi.advanceTimersByTime(100);
      fireKey("t");
    });

    expect(mockPush).toHaveBeenCalledWith("/today");
  });

  it("G+C 導航至 /canvas", () => {
    setup();

    act(() => {
      fireKey("g");
      vi.advanceTimersByTime(100);
      fireKey("c");
    });

    expect(mockPush).toHaveBeenCalledWith("/canvas");
  });

  it("G+S 導航至 /settings", () => {
    setup();

    act(() => {
      fireKey("g");
      vi.advanceTimersByTime(100);
      fireKey("s");
    });

    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("G 系列超過 500ms 不觸發導航", () => {
    setup();

    act(() => {
      fireKey("g");
      vi.advanceTimersByTime(600); // 超過 500ms
      fireKey("i");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("? 開啟 ShortcutsModal", () => {
    setup();

    act(() => {
      fireKey("?");
    });

    expect(onOpenShortcutsModal).toHaveBeenCalledTimes(1);
  });

  it("⌘K 呼叫 toggleCmdk", () => {
    setup();

    act(() => {
      fireKey("k", { metaKey: true });
    });

    expect(mockToggleCmdk).toHaveBeenCalledTimes(1);
  });

  it("input focus 中字母快捷鍵不觸發", () => {
    setup();

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // activeElement 為 input，字母快捷鍵應不觸發
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "g",
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input });
      window.dispatchEvent(event);
    });

    act(() => {
      fireKey("i");
    });

    expect(mockPush).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("⌘K 在 input focus 中仍觸發（不受 input focus 影響）", () => {
    setup();

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      fireKey("k", { metaKey: true });
    });

    expect(mockToggleCmdk).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it("移除後不再監聽", () => {
    const { unmount } = setup();
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
