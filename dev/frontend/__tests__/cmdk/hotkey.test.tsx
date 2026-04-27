/**
 * useCommandPaletteShortcut 單元測試
 *
 * 測試：
 * - ⌘K 開啟 palette
 * - Ctrl+K 開啟 palette
 * - IME 組字中不觸發
 * - Esc 由 Dialog 處理（此 hook 不監聽 Esc）
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommandPaletteShortcut } from "@/lib/hooks/use-cmdk-hotkey";

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers });
  window.dispatchEvent(event);
  return event;
}

describe("useCommandPaletteShortcut", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls toggle on ⌘K (metaKey)", () => {
    const toggle = vi.fn();
    renderHook(() => useCommandPaletteShortcut(toggle));

    fireKey("k", { metaKey: true });
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("calls toggle on Ctrl+K", () => {
    const toggle = vi.fn();
    renderHook(() => useCommandPaletteShortcut(toggle));

    fireKey("k", { ctrlKey: true });
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("does not call toggle on plain K", () => {
    const toggle = vi.fn();
    renderHook(() => useCommandPaletteShortcut(toggle));

    fireKey("k");
    expect(toggle).not.toHaveBeenCalled();
  });

  it("does not call toggle on ⌘K during IME composition", () => {
    const toggle = vi.fn();
    renderHook(() => useCommandPaletteShortcut(toggle));

    // isComposing: true 模擬 IME 組字中
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
      isComposing: true,
    });
    window.dispatchEvent(event);
    expect(toggle).not.toHaveBeenCalled();
  });

  it("removes event listener on unmount", () => {
    const toggle = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useCommandPaletteShortcut(toggle));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
