// CmdK Power Actions — 使用範例
// 技術選型：Next.js 14 + cmdk ^1 + shadcn/ui Dialog + Tailwind CSS v4
// 圖示套件：Lucide React

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "cmdk";
import {
  FileText,
  Plus,
  Navigation,
  Inbox,
  BookOpen,
  Calendar,
  Network,
  Settings,
  Sparkles,
  Search,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchEntry {
  id: string;
  title: string;
  category?: string;
  status?: string;
}

interface QuickCreateFormData {
  title: string;
  content: string;
  tags: string[];
}

// ─── AIModePrefixIndicator ───────────────────────────────────────────────────

function AIModePrefixIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5",
        "bg-accent-subtle text-accent-default text-xs font-medium",
        "animate-in fade-in duration-150"
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      AI Mode
    </div>
  );
}

// ─── SearchResultItem ─────────────────────────────────────────────────────────

interface SearchResultItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  kbd?: string;
  onSelect: () => void;
}

function SearchResultItem({
  icon,
  title,
  subtitle,
  badge,
  kbd,
  onSelect,
}: SearchResultItemProps) {
  return (
    <CommandItem
      onSelect={onSelect}
      className={cn(
        "flex h-[44px] items-center gap-3 px-3 py-2 rounded-md",
        "cursor-pointer transition-colors duration-100",
        "data-[selected=true]:bg-bg-subtle",
        // 選中狀態左側 accent 線
        "relative data-[selected=true]:before:absolute",
        "data-[selected=true]:before:left-0 data-[selected=true]:before:top-1",
        "data-[selected=true]:before:bottom-1 data-[selected=true]:before:w-[3px]",
        "data-[selected=true]:before:rounded-full data-[selected=true]:before:bg-accent-default"
      )}
    >
      <span className="text-fg-muted" aria-hidden="true">
        {icon}
      </span>
      <span className="flex flex-1 flex-col min-w-0">
        <span className="text-sm font-medium text-fg-default truncate">
          {title}
        </span>
        {subtitle && (
          <span className="text-xs text-fg-muted truncate">{subtitle}</span>
        )}
      </span>
      {badge && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5",
            "bg-secondary text-fg-muted text-xs shrink-0"
          )}
        >
          {badge}
        </span>
      )}
      {kbd && (
        <kbd
          className={cn(
            "font-mono text-xs text-fg-muted shrink-0",
            "border border-border rounded px-1.5 py-0.5",
            "shadow-[0_1px_0_0_var(--border)]"
          )}
          aria-label={kbd}
        >
          {kbd}
        </kbd>
      )}
    </CommandItem>
  );
}

// ─── AIActionItem ─────────────────────────────────────────────────────────────

interface AIActionItemProps {
  action: string;
  description: string;
  onSelect: () => void;
}

function AIActionItem({ action, description, onSelect }: AIActionItemProps) {
  return (
    <CommandItem
      onSelect={onSelect}
      className={cn(
        "flex h-[44px] items-center gap-3 px-3 py-2 rounded-md",
        "cursor-pointer transition-colors duration-100",
        "data-[selected=true]:bg-bg-subtle",
        "relative data-[selected=true]:before:absolute",
        "data-[selected=true]:before:left-0 data-[selected=true]:before:top-1",
        "data-[selected=true]:before:bottom-1 data-[selected=true]:before:w-[3px]",
        "data-[selected=true]:before:rounded-full data-[selected=true]:before:bg-accent-default"
      )}
    >
      <Sparkles className="h-5 w-5 text-accent-default shrink-0" aria-hidden="true" />
      <span className="flex flex-1 flex-col min-w-0">
        <span className="text-sm font-medium text-fg-default">
          <span className="text-accent-default">&gt;</span> {action}
        </span>
        <span className="text-xs text-fg-muted">{description}</span>
      </span>
      <kbd
        className={cn(
          "font-mono text-xs text-fg-muted shrink-0",
          "border border-border rounded px-1.5 py-0.5",
          "shadow-[0_1px_0_0_var(--border)]"
        )}
        aria-label="Enter 執行"
      >
        ↵
      </kbd>
    </CommandItem>
  );
}

// ─── CommandFooter ────────────────────────────────────────────────────────────

function CommandFooter({ isAIMode }: { isAIMode: boolean }) {
  const hints = [
    { kbd: "↑↓", label: "導航" },
    { kbd: "↵", label: "選擇" },
    { kbd: "Esc", label: "關閉" },
    ...(!isAIMode ? [{ kbd: ">", label: "AI 模式" }] : []),
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-t border-border",
        "bg-bg-subtle px-3 py-2"
      )}
      aria-hidden="true"
    >
      {hints.map(({ kbd, label }) => (
        <span key={kbd} className="flex items-center gap-1.5 text-xs text-fg-muted">
          <kbd
            className={cn(
              "font-mono text-xs",
              "border border-border rounded px-1.5 py-0.5",
              "shadow-[0_1px_0_0_var(--border)] bg-bg-muted"
            )}
          >
            {kbd}
          </kbd>
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── QuickCreateModal ─────────────────────────────────────────────────────────

interface QuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (entry: { id: string; title: string }) => void;
}

export function QuickCreateModal({
  open,
  onClose,
  onCreated,
}: QuickCreateModalProps) {
  const [form, setForm] = useState<QuickCreateFormData>({
    title: "",
    content: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [titleError, setTitleError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto focus title on open
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
      setForm({ title: "", content: "", tags: [] });
      setTitleError("");
    }
  }, [open]);

  const isDisabled = !form.title.trim() || isLoading;

  const handleCreate = async (classify: boolean) => {
    if (!form.title.trim()) {
      setTitleError("Title is required");
      titleRef.current?.focus();
      return;
    }
    setIsLoading(true);
    // engineer 在此實作 POST /api/v1/entries
    // const result = await createEntry({ title: form.title, content: form.content, tags: form.tags, status: "inbox" });
    // if (classify) await triggerClassify(result.id);
    setIsLoading(false);
    onClose();
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag || form.tags.includes(tag) || form.tags.length >= 10) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-create-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-xl",
          "bg-card border border-border shadow-lg",
          "p-6 flex flex-col gap-4",
          "animate-in zoom-in-95 fade-in duration-150"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            id="quick-create-title"
            className="text-base font-semibold text-fg-default"
          >
            New Entry
          </h2>
          <button
            onClick={onClose}
            aria-label="關閉"
            className={cn(
              "flex h-[44px] w-[44px] items-center justify-center rounded-lg",
              "text-fg-muted hover:text-fg-default hover:bg-secondary",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="qc-title"
            className="text-sm font-medium text-fg-default"
          >
            Title <span className="text-danger-default" aria-label="必填">*</span>
          </label>
          <input
            ref={titleRef}
            id="qc-title"
            type="text"
            value={form.title}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, title: e.target.value }));
              if (e.target.value.trim()) setTitleError("");
            }}
            aria-required="true"
            aria-invalid={!!titleError}
            aria-describedby={titleError ? "qc-title-error" : undefined}
            placeholder="Entry title..."
            className={cn(
              "w-full rounded-lg border px-4 py-2.5 text-sm",
              "bg-bg-default placeholder:text-fg-subtle",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              titleError ? "border-danger-default" : "border-border"
            )}
          />
          {titleError && (
            <p
              id="qc-title-error"
              role="alert"
              className="text-xs text-danger-default mt-0.5"
            >
              {titleError}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="qc-content"
            className="text-sm font-medium text-fg-default"
          >
            Content <span className="text-fg-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="qc-content"
            value={form.content}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="Add a note..."
            rows={3}
            className={cn(
              "w-full resize-none rounded-lg border border-border px-4 py-2.5 text-sm",
              "bg-bg-default placeholder:text-fg-subtle",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              "min-h-[72px] max-h-[144px]"
            )}
          />
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="qc-tag-input"
            className="text-sm font-medium text-fg-default"
          >
            Tags <span className="text-fg-muted font-normal">(optional)</span>
          </label>
          <div
            className={cn(
              "flex flex-wrap gap-1.5 min-h-[44px] rounded-lg border border-border",
              "bg-bg-default px-3 py-2",
              "focus-within:ring-2 focus-within:ring-border-focus"
            )}
          >
            {form.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "flex items-center gap-1 rounded-full",
                  "bg-secondary text-fg-default text-xs",
                  "px-2.5 py-0.5"
                )}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`移除標籤 ${tag}`}
                  className="text-fg-muted hover:text-fg-default"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              id="qc-tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={form.tags.length < 10 ? "Add tag..." : ""}
              disabled={form.tags.length >= 10}
              className={cn(
                "flex-1 min-w-[80px] text-xs bg-transparent",
                "focus:outline-none placeholder:text-fg-subtle"
              )}
            />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => handleCreate(false)}
            disabled={isDisabled}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
              "border border-border bg-secondary text-fg-default",
              "transition-colors duration-150",
              "hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Create as Draft
          </button>
          <button
            onClick={() => handleCreate(true)}
            disabled={isDisabled}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
              "bg-primary text-primary-fg",
              "transition-colors duration-150",
              "hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Create & Classify
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CmdKPower（主元件）──────────────────────────────────────────────────────

interface CmdKPowerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CmdKPower({ open, onOpenChange }: CmdKPowerProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAIMode = inputValue.startsWith(">");
  const trimmedInput = isAIMode ? inputValue.slice(1).trim() : inputValue;
  const showSearch = !isAIMode && inputValue.length >= 3;

  // Debounce 後端搜尋（200ms）
  useEffect(() => {
    if (!showSearch) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // engineer 在此實作 GET /api/v1/entries?q=...&per_page=5
        // const res = await fetch(`/api/v1/entries?q=${encodeURIComponent(inputValue)}&per_page=5`);
        // const data = await res.json();
        // setSearchResults(data.entries);
      } catch {
        // silent fail：Search Results 分組不顯示
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, showSearch]);

  // 清空 input 當 Dialog 關閉
  useEffect(() => {
    if (!open) {
      setInputValue("");
      setSearchResults([]);
    }
  }, [open]);

  const navItems = [
    { id: "inbox", icon: <Inbox className="h-5 w-5" />, title: "Go to Inbox", path: "/dashboard/inbox" },
    { id: "library", icon: <BookOpen className="h-5 w-5" />, title: "Go to Library", path: "/dashboard/library" },
    { id: "today", icon: <Calendar className="h-5 w-5" />, title: "Go to Today", path: "/dashboard/today" },
    { id: "canvas", icon: <Network className="h-5 w-5" />, title: "Go to Canvas", path: "/dashboard/canvas" },
    { id: "settings", icon: <Settings className="h-5 w-5" />, title: "Go to Settings", path: "/dashboard/settings" },
  ];

  const createItems = [
    { id: "new-entry", icon: <Plus className="h-5 w-5" />, title: "New Entry", kbd: "⌘N" },
    { id: "new-journal", icon: <FileText className="h-5 w-5" />, title: "New Journal Entry", subtitle: "journal, diary" },
  ];

  const aiActions = [
    { action: "summarize", description: "摘要最近的 entries，開啟 Copilot" },
    { action: "find duplicates", description: "找出重複筆記，開啟 Copilot" },
    { action: "classify all inbox", description: "批次分類 Inbox 中的所有 entries" },
    { action: "help", description: "查看所有鍵盤快捷鍵" },
  ].filter((a) =>
    trimmedInput === "" || a.action.includes(trimmedInput.toLowerCase())
  );

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        aria-label="命令面板"
      >
        <div className="flex flex-col">
          {/* AI Mode 提示列 */}
          <AIModePrefixIndicator visible={isAIMode} />

          {/* 搜尋框 */}
          <CommandInput
            value={inputValue}
            onValueChange={setInputValue}
            placeholder="搜尋或輸入指令..."
            aria-label="搜尋或輸入指令"
            aria-autocomplete="list"
            className="h-12 px-4 text-sm"
          />
        </div>

        <CommandList
          aria-label="搜尋結果"
          className="max-h-[60vh] overflow-y-auto"
        >
          <CommandEmpty>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Search className="h-8 w-8 text-fg-subtle" aria-hidden="true" />
              <p className="text-sm text-fg-muted">
                找不到「{inputValue}」的結果
              </p>
              <p className="text-xs text-fg-subtle">
                試試建立新的 Entry，或輸入 &gt; 使用 AI 指令
              </p>
            </div>
          </CommandEmpty>

          {/* AI Actions（> prefix mode） */}
          {isAIMode && (
            <CommandGroup heading="AI Actions">
              {aiActions.map((a) => (
                <AIActionItem
                  key={a.action}
                  action={a.action}
                  description={a.description}
                  onSelect={() => {
                    // engineer 在此實作各 AI 動作
                    onOpenChange(false);
                  }}
                />
              ))}
            </CommandGroup>
          )}

          {/* 非 AI mode：Navigation + Create + Search Results */}
          {!isAIMode && (
            <>
              <CommandGroup heading="Navigation">
                {navItems.map((item) => (
                  <SearchResultItem
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    onSelect={() => {
                      // router.push(item.path);
                      onOpenChange(false);
                    }}
                  />
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Create">
                {createItems.map((item) => (
                  <SearchResultItem
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    kbd={item.kbd}
                    onSelect={() => {
                      if (item.id === "new-entry") {
                        setShowQuickCreate(true);
                        onOpenChange(false);
                      }
                    }}
                  />
                ))}
              </CommandGroup>

              {/* Search Results（3+ chars） */}
              {showSearch && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Search Results">
                    {isSearching && (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-fg-muted">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        搜尋中...
                      </div>
                    )}
                    {searchResults.map((entry) => (
                      <SearchResultItem
                        key={entry.id}
                        icon={<FileText className="h-5 w-5" />}
                        title={entry.title}
                        badge={entry.category}
                        onSelect={() => {
                          // 開啟 EntryDetailSheet
                          onOpenChange(false);
                        }}
                      />
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>

        {/* 底部 Kbd 提示列 */}
        <CommandFooter isAIMode={isAIMode} />
      </CommandDialog>

      {/* QuickCreateModal（獨立 Dialog，CmdK 關閉後開啟） */}
      <QuickCreateModal
        open={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
      />
    </>
  );
}

// ─── 使用場景示範 ──────────────────────────────────────────────────────────────

// 1. App Shell 中整合（已在 F-037 skeleton 建立）
//
// const [cmdkOpen, setCmdkOpen] = useState(false);
//
// useEffect(() => {
//   const handler = (e: KeyboardEvent) => {
//     if ((e.metaKey || e.ctrlKey) && e.key === "k") {
//       e.preventDefault();
//       setCmdkOpen((prev) => !prev);
//     }
//   };
//   document.addEventListener("keydown", handler);
//   return () => document.removeEventListener("keydown", handler);
// }, []);
//
// <CmdKPower open={cmdkOpen} onOpenChange={setCmdkOpen} />

// 2. > AI mode 觸發示範
//   輸入 "> classify all inbox"
//   → AI Actions 分組出現 "classify all inbox" 項目
//   → 選中後觸發 POST /api/v1/entries/batch

// 3. 搜尋 3+ chars 示範
//   輸入 "go" (2 chars) → 無 Search Results
//   輸入 "gol" (3 chars) → debounce 200ms 後觸發 GET /api/v1/entries?q=gol
