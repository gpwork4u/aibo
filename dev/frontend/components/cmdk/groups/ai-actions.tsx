"use client";

/**
 * AIActionsGroup — `>` prefix AI 指令模式群組（F-049）
 *
 * 業務規則：
 *   - 只有輸入值以 `>` 開頭時才顯示此群組（其他群組隱藏）
 *   - `> summarize` / `> find duplicates` → 導向 copilot 頁並預填 prompt（query param）
 *   - `> classify all inbox` → 批次分類 POST /api/v1/entries/batch
 *   - `> help` → 顯示 ShortcutsModal（toast 提示）
 *   - 以 `>` 後的文字過濾動作清單
 */

import { useRouter } from "next/navigation";
import { Sparkles, Copy, Tag, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { apiClient } from "@/lib/api/client";
import type { ListEntriesResponse } from "@/lib/api/entries";

interface AiActionsGroupProps {
  /** 完整輸入值，應以 `>` 開頭 */
  rawInput: string;
  onSelect: () => void;
}

interface AiAction {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const AI_ACTIONS: AiAction[] = [
  {
    id: "summarize",
    label: "Summarize recent entries",
    description: "讓 Copilot 摘要最近的 entries",
    keywords: ["summarize", "summary", "摘要"],
    icon: Sparkles,
  },
  {
    id: "find-duplicates",
    label: "Find duplicate entries",
    description: "讓 Copilot 找出重複的 entries",
    keywords: ["find duplicates", "duplicate", "重複"],
    icon: Copy,
  },
  {
    id: "classify-inbox",
    label: "Classify all inbox entries",
    description: "批次分類所有 inbox entries",
    keywords: ["classify", "classify all inbox", "分類"],
    icon: Tag,
  },
  {
    id: "help",
    label: "Help — keyboard shortcuts",
    description: "顯示鍵盤快捷鍵總覽",
    keywords: ["help", "shortcuts", "說明", "快捷鍵"],
    icon: HelpCircle,
  },
];

async function classifyAllInbox(onSelect: () => void) {
  onSelect();
  const toastId = toast.loading("正在取得 inbox entries...");

  try {
    const res = await apiClient.get<ListEntriesResponse>(
      "/api/v1/entries?status=inbox&per_page=100",
    );
    const ids = (res.data ?? []).map((e) => e.id);

    if (ids.length === 0) {
      toast.dismiss(toastId);
      toast.info("Inbox 中沒有 entries");
      return;
    }

    toast.loading(`Classifying ${ids.length} entries...`, { id: toastId });

    await apiClient.post("/api/v1/entries/batch", {
      action: "classify",
      ids,
    });

    toast.success("Classification complete", { id: toastId });
  } catch {
    toast.error("分類失敗，請稍後再試", { id: toastId });
  }
}

export function AIActionsGroup({ rawInput, onSelect }: AiActionsGroupProps) {
  const router = useRouter();

  // 只在 `>` prefix 模式下顯示
  if (!rawInput.startsWith(">")) return null;

  // `>` 後的文字作為 filter（去頭空格）
  const filterText = rawInput.slice(1).trim().toLowerCase();

  const filtered = AI_ACTIONS.filter((action) => {
    if (!filterText) return true;
    return action.keywords.some((kw) => kw.toLowerCase().includes(filterText));
  });

  if (filtered.length === 0) return null;

  const handleSelect = (action: AiAction) => {
    switch (action.id) {
      case "summarize":
        router.push(
          "/dashboard?copilot=1&prompt=" +
            encodeURIComponent("Summarize my recent entries"),
        );
        onSelect();
        break;

      case "find-duplicates":
        router.push(
          "/dashboard?copilot=1&prompt=" +
            encodeURIComponent(
              "Find duplicate entries in my knowledge base and list them",
            ),
        );
        onSelect();
        break;

      case "classify-inbox":
        void classifyAllInbox(onSelect);
        break;

      case "help":
        toast.info("快捷鍵：⌘K 開啟 Command Palette，⌘/ 開啟說明", {
          duration: 5000,
        });
        onSelect();
        break;
    }
  };

  return (
    <CommandGroup heading="AI Actions">
      {filtered.map((action) => {
        const Icon = action.icon;
        return (
          <CommandItem
            key={action.id}
            value={`ai-${action.id}-${action.label}`}
            onSelect={() => handleSelect(action)}
          >
            <Icon className="mr-2 h-4 w-4 text-[--fg-subtle]" />
            <div className="flex flex-col">
              <span>{action.label}</span>
              <span className="text-xs text-[--fg-muted]">{action.description}</span>
            </div>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
