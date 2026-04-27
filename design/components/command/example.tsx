// Command Palette (CmdK wrapper) 使用範例
// 技術棧：cmdk + shadcn/ui CommandDialog + Lucide icons
// 對應規格：design/components/command/spec.md

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  FileText,
  Plus,
  Settings,
  CalendarDays,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { useRouter } from "next/navigation";

// --- 資料結構 ---
interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  kbd?: string;
  onSelect: () => void;
}

// --- 主 Command Palette ---
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ⌘K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const runAction = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  const recentItems: CommandAction[] = [
    {
      id: "recent-1",
      label: "今日會議紀錄",
      description: "日誌",
      icon: FileText,
      onSelect: () => runAction(() => router.push("/journal/today")),
    },
    {
      id: "recent-2",
      label: "週報 2026-04",
      description: "日誌",
      icon: FileText,
      onSelect: () => runAction(() => router.push("/journal/weekly")),
    },
    {
      id: "recent-3",
      label: "Q2 OKR 追蹤",
      description: "資料庫",
      icon: BookOpen,
      onSelect: () => runAction(() => router.push("/library/okr")),
    },
  ];

  const actions: CommandAction[] = [
    {
      id: "new-note",
      label: "新增筆記",
      icon: Plus,
      kbd: "⌘N",
      onSelect: () => runAction(() => router.push("/journal/new")),
    },
    {
      id: "today",
      label: "今日行程",
      icon: CalendarDays,
      onSelect: () => runAction(() => router.push("/today")),
    },
    {
      id: "settings",
      label: "開啟設定",
      icon: Settings,
      kbd: "⌘,",
      onSelect: () => runAction(() => router.push("/settings")),
    },
  ];

  return (
    <>
      {/* SearchTrigger（放在 TopBar） */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] text-sm text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-subtle)] transition-colors w-full max-w-xs"
        aria-label="開啟搜尋（⌘K）"
      >
        <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">搜尋...</span>
        <Kbd className="hidden sm:flex">⌘K</Kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        aria-label="Command palette"
      >
        <CommandInput
          placeholder="搜尋或輸入指令..."
          aria-label="搜尋"
          aria-autocomplete="list"
        />

        <CommandList>
          {/* 空結果 */}
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Search className="w-8 h-8 text-[color:var(--fg-subtle)]" aria-hidden="true" />
              <p className="text-sm text-[color:var(--fg-muted)]">找不到相關結果</p>
              <p className="text-xs text-[color:var(--fg-subtle)]">試試其他關鍵字</p>
            </div>
          </CommandEmpty>

          {/* 最近使用 */}
          <CommandGroup heading="最近使用">
            {recentItems.map((item) => (
              <CommandItem
                key={item.id}
                value={item.label}
                onSelect={item.onSelect}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
                role="option"
              >
                <item.icon className="w-5 h-5 text-[color:var(--fg-muted)] shrink-0" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
                {item.description && (
                  <span className="text-xs text-[color:var(--fg-subtle)] shrink-0">{item.description}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Actions */}
          <CommandGroup heading="Actions">
            {actions.map((action) => (
              <CommandItem
                key={action.id}
                value={action.label}
                onSelect={action.onSelect}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
                role="option"
              >
                <action.icon className="w-5 h-5 text-[color:var(--fg-muted)] shrink-0" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium">{action.label}</span>
                {action.kbd && (
                  <Kbd className="shrink-0">{action.kbd}</Kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        {/* 底部提示列 */}
        <div className="flex items-center gap-4 px-3 py-2 border-t border-[color:var(--border)] text-xs text-[color:var(--fg-subtle)]">
          <span className="flex items-center gap-1">
            <Kbd size="xs">↑</Kbd>
            <Kbd size="xs">↓</Kbd>
            <span>導航</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="xs">↵</Kbd>
            <span>選擇</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="xs">Esc</Kbd>
            <span>關閉</span>
          </span>
        </div>
      </CommandDialog>
    </>
  );
}

// --- Kbd 元件（供 Command Palette 底部提示使用） ---
// 對應 design/components/kbd/spec.md
export function Kbd({
  children,
  size = "sm",
  className,
}: {
  children: React.ReactNode;
  size?: "xs" | "sm";
  className?: string;
}) {
  return (
    <kbd
      className={[
        "inline-flex items-center justify-center",
        "rounded border border-[color:var(--border)] bg-[color:var(--bg-muted)]",
        "font-mono text-[color:var(--fg-muted)]",
        size === "xs" ? "min-w-5 h-5 px-1 text-[10px]" : "min-w-6 h-6 px-1.5 text-xs",
        "shadow-[0_1px_0_0_var(--border)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </kbd>
  );
}
