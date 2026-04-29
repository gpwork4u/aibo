"use client";

/**
 * MessageInput — 訊息輸入框
 *
 * - Enter 送出；Shift+Enter 換行
 * - Streaming 中 SendButton disabled，防止重複送出
 * - 送出後清空輸入框
 */

import { useRef, useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SendHorizontal } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // 還原 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 自動調整高度（最多 120px）
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div
      className="border-t border-border bg-background px-3 py-2"
      data-testid="copilot-input-area"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Copilot…"
          rows={1}
          disabled={disabled}
          data-testid="copilot-textarea"
          className={cn(
            "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[36px] max-h-[120px]",
          )}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          data-testid="copilot-send-btn"
          aria-label="送出訊息"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      {disabled && (
        <p className="mt-1 text-xs text-muted-foreground">Copilot is thinking…</p>
      )}
    </div>
  );
}
