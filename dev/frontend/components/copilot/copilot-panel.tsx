"use client";

/**
 * CopilotPanel — 右側 resizable side panel
 *
 * - 寬度預設 360px，可 resize 至 240-600px（拖曳左側 handle）
 * - 從右側滑入動畫（300ms ease-out）
 * - 整合 useCopilotSSE hook
 * - Header：標題 + 關閉 + 清除 Session
 * - MessageList + TypingIndicator + MessageInput
 */

import { useCallback, useRef, useState } from "react";
import { Bot, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopilotStore } from "@/lib/stores/copilot-store";
import { useCopilotSSE } from "@/lib/hooks/use-copilot-sse";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

const MIN_WIDTH = 240;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

export function CopilotPanel() {
  const isOpen = useCopilotStore((s) => s.isOpen);
  const close = useCopilotStore((s) => s.close);
  const clearSession = useCopilotStore((s) => s.clearSession);
  const messages = useCopilotStore((s) => s.messages);
  const isStreaming = useCopilotStore((s) => s.isStreaming);
  const sendMessage = useCopilotStore((s) => s.sendMessage);
  const error = useCopilotStore((s) => s.error);
  const clearError = useCopilotStore((s) => s.clearError);

  // SSE 連線
  useCopilotSSE();

  // resize handle
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;

    const onMouseMove = (me: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = startXRef.current - me.clientX; // 往左拖 = 加寬
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidthRef.current + delta),
      );
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [panelWidth]);

  return (
    <aside
      data-testid="copilot-panel"
      aria-label="Copilot 助手"
      style={{ width: isOpen ? panelWidth : 0 }}
      className={cn(
        "sticky top-0 h-screen flex-col border-l border-border bg-background overflow-hidden",
        "transition-[width] duration-300 ease-out",
        isOpen ? "flex" : "hidden",
      )}
    >
      {/* Resize handle（左側拖曳條） */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="調整 Copilot 寬度"
        data-testid="copilot-resize-handle"
        className={cn(
          "absolute left-0 top-0 h-full w-1 cursor-col-resize",
          "hover:bg-primary/30 active:bg-primary/50 transition-colors",
          "z-10",
        )}
        onMouseDown={onMouseDown}
      />

      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Copilot</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearSession}
            aria-label="清除對話"
            data-testid="copilot-clear-btn"
            title="Clear session"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={close}
            aria-label="關閉 Copilot"
            data-testid="copilot-close-btn"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList messages={messages} />

        {/* Typing Indicator */}
        {isStreaming && (
          <div
            className="px-4 pb-2 flex items-center gap-1.5"
            data-testid="copilot-typing-indicator"
            aria-label="Copilot 正在回應"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
          </div>
        )}

        {/* Error toast inline */}
        {error && (
          <div
            className="mx-3 mb-2 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            data-testid="copilot-error"
          >
            <span>{error}</span>
            <button
              onClick={clearError}
              className="ml-2 shrink-0 opacity-70 hover:opacity-100"
              aria-label="關閉錯誤提示"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Input */}
        <MessageInput
          onSend={sendMessage}
          disabled={isStreaming}
        />
      </div>
    </aside>
  );
}
