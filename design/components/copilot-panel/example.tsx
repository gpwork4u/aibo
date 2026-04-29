// CopilotPanel — 使用範例
// 技術選型：Next.js 14 App Router + Tailwind CSS v4 + shadcn/ui + Zustand
// 圖示套件：Lucide React

import { useRef, useState, useCallback, useEffect } from "react";
import { Bot, X, SendHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  isTruncated?: boolean;
}

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

// ─── Kbd animation CSS（在 globals.css 中定義）────────────────────────────────
// @keyframes blink {
//   0%, 100% { opacity: 1; }
//   50%       { opacity: 0; }
// }
// @keyframes typingBounce {
//   0%, 80%, 100% { transform: translateY(0); }
//   40%           { transform: translateY(-6px); }
// }
// .animate-blink { animation: blink 1s step-start infinite; }
// @media (prefers-reduced-motion: reduce) {
//   .animate-blink { animation: none; }
//   .animate-typing-bounce { animation: none; }
// }

// ─── ResizeHandle ─────────────────────────────────────────────────────────────

function ResizeHandle({
  onResize,
}: {
  onResize: (delta: number) => void;
}) {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = startXRef.current - e.clientX; // 往左拖 = 增加寬度
        onResize(delta);
        startXRef.current = e.clientX;
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onResize]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="調整面板寬度"
      className={cn(
        "absolute left-0 top-0 h-full w-2 cursor-col-resize",
        "transition-colors duration-150",
        "hover:bg-border-focus/40",
        "active:bg-border-focus"
      )}
      onMouseDown={handleMouseDown}
    />
  );
}

// ─── CopilotHeader ────────────────────────────────────────────────────────────

interface CopilotHeaderProps {
  onClose: () => void;
  onClearSession: () => void;
}

function CopilotHeader({ onClose, onClearSession }: CopilotHeaderProps) {
  return (
    <div className="flex h-[52px] items-center gap-2 border-b border-border px-4">
      <Bot className="h-4 w-4 text-fg-muted" aria-hidden="true" />
      <span className="flex-1 text-sm font-semibold text-fg-default">
        Copilot
      </span>
      <button
        onClick={onClearSession}
        aria-label="清除對話記錄"
        className={cn(
          "text-xs text-fg-muted transition-colors duration-150",
          "hover:text-fg-default focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring rounded"
        )}
      >
        Clear session
      </button>
      <button
        onClick={onClose}
        aria-label="關閉 Copilot 面板"
        className={cn(
          "flex h-[44px] w-[44px] items-center justify-center rounded-lg",
          "text-fg-muted transition-colors duration-150",
          "hover:text-fg-default hover:bg-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── UserMessage ──────────────────────────────────────────────────────────────

function UserMessage({ content }: { content: string }) {
  return (
    <article
      className="flex justify-end my-1"
      aria-label={`你：${content}`}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg rounded-br-sm",
          "bg-primary text-primary-fg",
          "px-4 py-3 text-sm leading-relaxed"
        )}
      >
        {content}
      </div>
    </article>
  );
}

// ─── AssistantMessage ─────────────────────────────────────────────────────────

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
  isTruncated?: boolean;
}

function AssistantMessage({
  content,
  isStreaming,
  isTruncated,
}: AssistantMessageProps) {
  return (
    <article
      className="flex justify-start my-1"
      aria-label={`Copilot：${content}`}
      aria-busy={isStreaming ? "true" : undefined}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg rounded-bl-sm",
          "bg-card text-fg-default border border-border",
          "px-4 py-3 text-sm leading-relaxed"
        )}
      >
        {content}
        {isTruncated && (
          <span className="text-fg-muted" aria-hidden="true">
            {" "}
            …
          </span>
        )}
        {isStreaming && !isTruncated && (
          <span
            className="inline-block w-[2px] h-[1em] ml-[1px] align-middle bg-current animate-blink"
            aria-hidden="true"
          />
        )}
      </div>
    </article>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div
      className="flex justify-start my-1"
      aria-label="Copilot 正在輸入"
      aria-live="assertive"
    >
      <div
        className={cn(
          "w-14 rounded-lg rounded-bl-sm",
          "bg-card border border-border",
          "px-4 py-3 flex items-center gap-1"
        )}
      >
        {[0, 150, 300].map((delay, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-fg-muted animate-typing-bounce"
            style={{ animationDelay: `${delay}ms` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

// ─── SuggestionChip ──────────────────────────────────────────────────────────

function SuggestionChip({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (label: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(label)}
      className={cn(
        "rounded-full border border-border",
        "bg-secondary text-fg-default text-xs",
        "px-3 py-1.5 transition-colors duration-150",
        "hover:bg-secondary-hover focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      &ldquo;{label}&rdquo;
    </button>
  );
}

// ─── WelcomeState ─────────────────────────────────────────────────────────────

function WelcomeState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    "Summarize recent entries",
    "Find duplicate notes",
    "What did I learn this week?",
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
      <Bot className="h-12 w-12 text-fg-subtle" aria-hidden="true" />
      <p className="text-center text-sm text-fg-muted leading-relaxed">
        Ask me anything about your knowledge base.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <SuggestionChip key={s} label={s} onSelect={onSuggestion} />
        ))}
      </div>
    </div>
  );
}

// ─── CopilotInputArea ─────────────────────────────────────────────────────────

interface CopilotInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
}

function CopilotInputArea({
  value,
  onChange,
  onSubmit,
  isStreaming,
}: CopilotInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = isStreaming || value.trim() === "";

  // Auto resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-bg-subtle p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="輸入訊息"
        aria-multiline="true"
        placeholder="Ask me anything about your knowledge base."
        rows={1}
        className={cn(
          "w-full resize-none rounded-lg border border-border",
          "bg-bg-default px-4 py-3 text-sm leading-relaxed",
          "placeholder:text-fg-subtle",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          "transition-[height] duration-100",
          "min-h-[44px] max-h-[120px]"
        )}
      />
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={isDisabled}
          aria-label="送出訊息"
          className={cn(
            "flex h-[44px] w-[44px] items-center justify-center rounded-lg",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDisabled
              ? "bg-secondary text-fg-muted opacity-50 cursor-not-allowed"
              : "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active"
          )}
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── MessageList ──────────────────────────────────────────────────────────────

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Detect manual scroll up
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 48;
    userScrolledUp.current = !isAtBottom;
  };

  // Auto scroll to bottom on new messages unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isStreaming]);

  return (
    <div
      ref={containerRef}
      role="log"
      aria-label="對話記錄"
      aria-live="polite"
      onScroll={handleScroll}
      className="flex flex-1 flex-col overflow-y-auto px-4 py-3"
    >
      {messages.map((msg) =>
        msg.role === "user" ? (
          <UserMessage key={msg.id} content={msg.content} />
        ) : (
          <AssistantMessage
            key={msg.id}
            content={msg.content}
            isStreaming={msg.isStreaming}
            isTruncated={msg.isTruncated}
          />
        )
      )}
      {isStreaming && (
        <TypingIndicator />
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── CopilotPanel（主元件）────────────────────────────────────────────────────

export function CopilotPanel({
  isOpen,
  onClose,
  defaultWidth = 360,
  minWidth = 240,
  maxWidth = 600,
}: CopilotPanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // ResizeHandle callback
  const handleResize = useCallback(
    (delta: number) => {
      setWidth((prev) => Math.min(maxWidth, Math.max(minWidth, prev + delta)));
    },
    [minWidth, maxWidth]
  );

  // Suggestion chip handler
  const handleSuggestion = (text: string) => {
    setInputValue(text);
  };

  // Send message
  const handleSubmit = () => {
    if (!inputValue.trim() || isStreaming) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsStreaming(true);
    // engineer 在此實作 SSE 串流（POST + EventSource）
  };

  // Clear session
  const handleClearSession = () => {
    setMessages([]);
    setIsStreaming(false);
  };

  return (
    <>
      {/* Panel 本體 */}
      <aside
        role="complementary"
        aria-label="Copilot AI 助手"
        aria-hidden={!isOpen}
        style={{ width: isOpen ? width : 0 }}
        className={cn(
          "relative flex h-full flex-col",
          "border-l border-border bg-bg-subtle",
          "overflow-hidden",
          // 開關動畫
          "transition-[width,transform] duration-300 ease-out",
          !isOpen && "transition-[width,transform] duration-200 ease-in"
        )}
      >
        {/* ResizeHandle（面板左側） */}
        <ResizeHandle onResize={handleResize} />

        {/* Header */}
        <CopilotHeader
          onClose={onClose}
          onClearSession={handleClearSession}
        />

        {/* Content */}
        {messages.length === 0 && !isStreaming ? (
          <WelcomeState onSuggestion={handleSuggestion} />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        {/* InputArea */}
        <CopilotInputArea
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
        />
      </aside>
    </>
  );
}

// ─── 使用場景示範 ──────────────────────────────────────────────────────────────

// 1. App Shell Layout（在 dev/src/app/(shell)/layout.tsx 中整合）
//
// import { useCopilotStore } from "@/stores/copilot";
// import { CopilotPanel } from "@/components/copilot-panel";
//
// export default function ShellLayout({ children }) {
//   const { isOpen, close } = useCopilotStore();
//   return (
//     <div className="flex h-screen">
//       <Sidebar />
//       <main className="flex-1 overflow-hidden">{children}</main>
//       <CopilotPanel isOpen={isOpen} onClose={close} />
//     </div>
//   );
// }

// 2. 開啟面板（⌘J 快捷鍵由 useKeyboardShortcuts hook 觸發）
//
// const { open } = useCopilotStore();
// open(); // → isOpen = true → CopilotPanel 滑入

// 3. Streaming 訊息更新（SSE token 事件，由 engineer 實作）
//
// eventSource.addEventListener("token", (e) => {
//   const { token } = JSON.parse(e.data);
//   // 更新最後一則 AssistantMessage 的 content
// });
// eventSource.addEventListener("done", () => {
//   setIsStreaming(false);
//   // 移除 isStreaming flag from last message
// });
