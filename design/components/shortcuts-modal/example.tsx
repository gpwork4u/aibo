// ShortcutsModal — 使用範例
// 技術選型：Next.js 14 + shadcn/ui Dialog + Tailwind CSS v4
// 圖示套件：Lucide React

import { useEffect } from "react";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShortcutItem {
  description: string;
  keys: string[];
  ariaLabels?: string[];
}

interface ShortcutSection {
  id: string;
  title: string;
  shortcuts: ShortcutItem[];
}

// ─── 快捷鍵資料 ───────────────────────────────────────────────────────────────

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    id: "navigation",
    title: "Navigation",
    shortcuts: [
      { description: "Open Command Palette", keys: ["⌘", "K"], ariaLabels: ["Command", "K"] },
      { description: "Open / Close Copilot", keys: ["⌘", "J"], ariaLabels: ["Command", "J"] },
      { description: "Go to Inbox", keys: ["G", "I"] },
      { description: "Go to Library", keys: ["G", "L"] },
      { description: "Go to Today", keys: ["G", "T"] },
      { description: "Go to Canvas", keys: ["G", "C"] },
      { description: "Go to Settings", keys: ["G", "S"] },
      { description: "Shortcuts Help", keys: ["?"] },
      { description: "Close Overlay", keys: ["Esc"] },
    ],
  },
  {
    id: "inbox",
    title: "Inbox",
    shortcuts: [
      { description: "Next item", keys: ["J"] },
      { description: "Previous item", keys: ["K"] },
      { description: "Expand / Edit", keys: ["Enter"] },
      { description: "Archive", keys: ["A"] },
      { description: "Delete", keys: ["D"] },
      { description: "Quick edit title", keys: ["E"] },
      { description: "Multi-select toggle", keys: ["Space"] },
    ],
  },
  {
    id: "library",
    title: "Library",
    shortcuts: [
      { description: "Move up / down", keys: ["J", "/", "K"] },
      { description: "Open detail", keys: ["Enter"] },
      { description: "Focus search", keys: ["/"] },
      { description: "Clear search / Close sheet", keys: ["Esc"] },
    ],
  },
  {
    id: "entry",
    title: "Entry",
    shortcuts: [
      { description: "Enter edit mode", keys: ["E"] },
      { description: "Save", keys: ["⌘", "S"], ariaLabels: ["Command", "S"] },
      { description: "Close sheet", keys: ["Esc"] },
    ],
  },
  {
    id: "copilot",
    title: "Copilot",
    shortcuts: [
      { description: "Send message", keys: ["Enter"] },
      { description: "New line", keys: ["Shift", "Enter"] },
      { description: "Open Command Palette", keys: ["⌘", "K"], ariaLabels: ["Command", "K"] },
    ],
  },
];

// ─── Kbd 元件（沿用 design/components/kbd/spec.md） ──────────────────────────

interface KbdProps {
  children: React.ReactNode;
  ariaLabel?: string;
}

function Kbd({ children, ariaLabel }: KbdProps) {
  return (
    <kbd
      aria-label={ariaLabel}
      className={cn(
        "font-mono text-xs text-fg-muted",
        "bg-bg-muted border border-border rounded",
        "px-1.5 py-0.5",
        "shadow-[0_1px_0_0_var(--border)]",
        "inline-flex items-center justify-center",
        "min-w-[20px] h-[24px]"
      )}
    >
      {children}
    </kbd>
  );
}

// ─── ShortcutRow ──────────────────────────────────────────────────────────────

function ShortcutRow({ item }: { item: ShortcutItem }) {
  return (
    <div
      className={cn(
        "flex min-h-[40px] items-center gap-4",
        "rounded-md px-2 py-1.5",
        "transition-colors duration-100",
        "hover:bg-bg-subtle"
      )}
    >
      {/* 描述文字 */}
      <span className="flex-1 text-sm text-fg-default">{item.description}</span>

      {/* Kbd 組合 */}
      <span className="flex items-center gap-1" aria-hidden="true">
        {item.keys.map((key, i) => {
          // "/" 在 Library section 用作分隔符，不渲染為 Kbd
          if (key === "/" && item.keys.length === 3 && i === 1) {
            return (
              <span key={i} className="text-xs text-fg-muted mx-0.5">
                /
              </span>
            );
          }
          return (
            <Kbd key={i} ariaLabel={item.ariaLabels?.[i]}>
              {key}
            </Kbd>
          );
        })}
      </span>

      {/* screen reader 用完整描述（可選） */}
      <span className="sr-only">
        {item.description}: {item.keys.join(" + ")}
      </span>
    </div>
  );
}

// ─── ShortcutSection ──────────────────────────────────────────────────────────

function ShortcutSectionBlock({ section }: { section: ShortcutSection }) {
  return (
    <section aria-labelledby={`shortcuts-section-${section.id}`}>
      <h3
        id={`shortcuts-section-${section.id}`}
        className={cn(
          "mb-2 pb-1 border-b border-border",
          "text-xs font-semibold uppercase tracking-wider text-fg-subtle"
        )}
      >
        {section.title}
      </h3>
      <div className="flex flex-col">
        {section.shortcuts.map((item, i) => (
          <ShortcutRow key={i} item={item} />
        ))}
      </div>
    </section>
  );
}

// ─── ShortcutsModal ───────────────────────────────────────────────────────────

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  // Keyboard close（Escape）
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className={cn(
          "relative z-10 w-full max-w-xl rounded-xl",
          "bg-card border border-border shadow-lg",
          "flex flex-col max-h-[80vh]",
          "animate-in zoom-in-95 fade-in duration-150",
          "@media (prefers-reduced-motion: reduce) animate-in:opacity-0 animate-in:fade-in"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-[56px] items-center gap-2 border-b border-border px-6",
            "shrink-0"
          )}
        >
          <Keyboard className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          <h2
            id="shortcuts-modal-title"
            className="flex-1 text-base font-semibold text-fg-default"
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="關閉快捷鍵說明"
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

        {/* Content */}
        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
          {SHORTCUT_SECTIONS.map((section) => (
            <ShortcutSectionBlock key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 使用場景示範 ──────────────────────────────────────────────────────────────

// 1. App Shell 中整合（useKeyboardShortcuts hook 觸發）
//
// const [shortcutsOpen, setShortcutsOpen] = useState(false);
//
// // ? 鍵觸發（非 input focus 狀態）
// useEffect(() => {
//   const handler = (e: KeyboardEvent) => {
//     if (e.key === "?" && !isInputFocused()) {
//       e.preventDefault();
//       setShortcutsOpen(true);
//     }
//   };
//   document.addEventListener("keydown", handler);
//   return () => document.removeEventListener("keydown", handler);
// }, []);
//
// <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

// 2. CmdK "> help" 觸發
//   選中 AI Actions 中的 "help"
//   → setShortcutsOpen(true)

// 3. 自訂 sections（新增 feature 後擴充）
//   在 SHORTCUT_SECTIONS 陣列新增 section 即可自動渲染
//   不需修改元件本體

// ─── Kbd 單獨使用示範 ─────────────────────────────────────────────────────────

// 在任何元件中引入 Kbd：
// <Kbd ariaLabel="Command K">⌘</Kbd>
// <Kbd>K</Kbd>

// 組合快捷鍵：
// <span className="flex items-center gap-1">
//   <Kbd ariaLabel="Command">⌘</Kbd>
//   <Kbd>K</Kbd>
// </span>

// 在 Tooltip 中使用：
// <TooltipContent>
//   Open Command Palette
//   <span className="flex items-center gap-1 ml-2">
//     <Kbd ariaLabel="Command">⌘</Kbd>
//     <Kbd>K</Kbd>
//   </span>
// </TooltipContent>
