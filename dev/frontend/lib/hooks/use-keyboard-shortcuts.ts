"use client";

/**
 * useKeyboardShortcuts — 全域鍵盤快捷鍵 hook
 *
 * 功能：
 * - 全域快捷鍵：⌘K（Command Palette）、?（Shortcuts Modal）、G 系列導航
 * - G 系列 sequential key：500ms timeout，G+I/L/T/C/S
 * - Business Rule：input/textarea/select focus 中，字母快捷鍵不觸發
 * - ⌘ 快捷鍵不受 input focus 影響
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCmdk } from "@/components/cmdk/cmdk-provider";

export interface UseKeyboardShortcutsOptions {
  onOpenShortcutsModal: () => void;
}

const SEQUENTIAL_TIMEOUT_MS = 500;

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName?.toUpperCase();
  return ["INPUT", "TEXTAREA", "SELECT"].includes(tag ?? "");
}

export function useKeyboardShortcuts({
  onOpenShortcutsModal,
}: UseKeyboardShortcutsOptions): void {
  const router = useRouter();
  const { toggle: toggleCmdk } = useCmdk();
  const lastKeyRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 跳過 IME 組字中的事件
      if (e.isComposing) return;

      const now = Date.now();

      // ⌘K — 開啟 Command Palette（不受 input focus 影響）
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCmdk();
        lastKeyRef.current = null;
        return;
      }

      // 字母快捷鍵在 input 中不觸發
      if (isInputFocused()) {
        lastKeyRef.current = null;
        return;
      }

      // G 系列 sequential key
      if (lastKeyRef.current?.key === "g") {
        const elapsed = now - lastKeyRef.current.time;
        if (elapsed <= SEQUENTIAL_TIMEOUT_MS) {
          // 在 500ms 內
          const secondKey = e.key.toLowerCase();
          lastKeyRef.current = null;

          switch (secondKey) {
            case "i":
              e.preventDefault();
              router.push("/inbox");
              return;
            case "l":
              e.preventDefault();
              router.push("/library");
              return;
            case "t":
              e.preventDefault();
              router.push("/today");
              return;
            case "c":
              e.preventDefault();
              router.push("/canvas");
              return;
            case "s":
              e.preventDefault();
              router.push("/settings");
              return;
            default:
              // 不識別的第二個 key，忽略
              return;
          }
        } else {
          // 超過 500ms，重置
          lastKeyRef.current = null;
        }
      }

      // ? — 開啟 Shortcuts Modal
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenShortcutsModal();
        return;
      }

      // G — 開始 sequential key
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        lastKeyRef.current = { key: "g", time: now };
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toggleCmdk, onOpenShortcutsModal]);
}
