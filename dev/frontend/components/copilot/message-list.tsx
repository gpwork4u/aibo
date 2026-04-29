"use client";

/**
 * MessageList — 顯示 Copilot 對話訊息
 *
 * - 新訊息時自動 scroll to bottom
 * - 使用者手動向上滾動時停止自動 scroll
 * - AssistantMessage streaming：逐字渲染（isStreaming 時顯示游標）
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type Message } from "@/lib/stores/copilot-store";
import { Bot, User } from "lucide-react";

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // 監聽使用者手動向上滾動
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      if (!isAtBottom) {
        setUserScrolled(true);
      } else {
        setUserScrolled(false);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // 新訊息 scroll to bottom（除非使用者已向上滾動）
  useEffect(() => {
    if (userScrolled) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, userScrolled]);

  if (messages.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center"
        data-testid="copilot-welcome"
      >
        <Bot className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Ask me anything about your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      data-testid="copilot-message-list"
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
      data-testid={isUser ? "copilot-user-message" : "copilot-assistant-message"}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm",
        )}
      >
        {message.content}
        {message.isStreaming && (
          <span
            className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current opacity-70"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
