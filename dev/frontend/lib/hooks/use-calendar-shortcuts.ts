"use client";

import * as React from "react";
import type { CalendarView } from "@/lib/api/calendar";

export interface UseCalendarShortcutsParams {
  view: CalendarView;
  /** 觸發 prev（-1 step）/next（+1 step），step 由 view 決定。 */
  onPrev: () => void;
  onNext: () => void;
  /** T：回到今天。 */
  onToday: () => void;
  /** PgUp/PgDn：大步移動（月/四週/七天）。 */
  onPrevLarge: () => void;
  onNextLarge: () => void;
  /** M/W/D 或 1/2/3：切 view。 */
  onSetView: (v: CalendarView) => void;
  /** 是否啟用（預設 true）。 */
  enabled?: boolean;
}

/**
 * 行事曆鍵盤快捷鍵。
 *
 * - `←` / `k` / `h`：上一步（view 決定步長）
 * - `→` / `j` / `l`：下一步（vim 慣例：j 下/next、k 上/prev）
 * - `t`：回到今天
 * - `1` / `m` / `M`：切月視圖
 * - `2` / `w` / `W`：切週視圖
 * - `3` / `d` / `D`：切日視圖
 * - `PageUp` / `PageDown`：大步移動（月視圖 = 1 個月；週 = 4 週；日 = 7 天）
 *
 * 當焦點在 input / textarea / select / contenteditable 時不觸發（修飾鍵組合也跳過）。
 */
export function useCalendarShortcuts(params: UseCalendarShortcutsParams): void {
  const {
    onPrev,
    onNext,
    onToday,
    onPrevLarge,
    onNextLarge,
    onSetView,
    enabled = true,
  } = params;

  // 用 ref 保留最新 handler，避免 effect 頻繁重綁
  const handlersRef = React.useRef({
    onPrev,
    onNext,
    onToday,
    onPrevLarge,
    onNextLarge,
    onSetView,
  });
  React.useEffect(() => {
    handlersRef.current = {
      onPrev,
      onNext,
      onToday,
      onPrevLarge,
      onNextLarge,
      onSetView,
    };
  }, [onPrev, onNext, onToday, onPrevLarge, onNextLarge, onSetView]);

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // 修飾鍵按下時不攔截（避免搶到瀏覽器快捷）
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(document.activeElement)) return;
      if (isTypingTarget(e.target)) return;

      const h = handlersRef.current;
      switch (e.key) {
        case "ArrowLeft":
        case "k":
        case "h":
          // vim 慣例：k 向上 = prev；h 向左 = prev；搭配 ArrowLeft。
          e.preventDefault();
          h.onPrev();
          break;
        case "ArrowRight":
        case "j":
        case "l":
          // vim 慣例：j 向下 = next；l 向右 = next；搭配 ArrowRight。
          e.preventDefault();
          h.onNext();
          break;
        case "t":
        case "T":
          e.preventDefault();
          h.onToday();
          break;
        case "PageUp":
          e.preventDefault();
          h.onPrevLarge();
          break;
        case "PageDown":
          e.preventDefault();
          h.onNextLarge();
          break;
        case "1":
        case "m":
        case "M":
          e.preventDefault();
          h.onSetView("month");
          break;
        case "2":
        case "w":
        case "W":
          e.preventDefault();
          h.onSetView("week");
          break;
        case "3":
        case "d":
        case "D":
          e.preventDefault();
          h.onSetView("day");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
