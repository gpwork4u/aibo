"use client";

/**
 * useCommandPaletteShortcut — 全域 ⌘K / Ctrl+K 快捷鍵 hook。
 * 監聽 window keydown，呼叫 toggle() 開關 command palette。
 * 跳過 IME 組字中的事件。
 */

import { useEffect } from "react";

export function useCommandPaletteShortcut(toggle: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 跳過 IME 組字中的事件
      if (e.isComposing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
}
