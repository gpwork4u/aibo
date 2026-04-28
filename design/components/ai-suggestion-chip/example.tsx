// AI 建議連結 Chip 元件範例
// 技術基礎：shadcn/ui + Tailwind CSS v4 + Lucide icons

import React, { useState, useCallback } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 型別 ─────────────────────────────────────────────────────────────────────

type LinkType =
  | "derives_from"
  | "contradicts"
  | "duplicate_of"
  | "references"
  | "supersedes"
  | "related_to";

type SuggestionStatus = "pending" | "accepted" | "rejected";

interface AISuggestion {
  id: string;
  link_type: LinkType;
  targetId: string;
  targetTitle: string;
  relation?: string;
  confidence: number;
  status: SuggestionStatus;
}

// ─── Link Type 色彩對應 ────────────────────────────────────────────────────────

const LINK_TYPE_CONFIG: Record<LinkType, { hex: string; label: string }> = {
  derives_from:  { hex: "#3B82F6", label: "衍生自" },
  contradicts:   { hex: "#EF4444", label: "矛盾" },
  duplicate_of:  { hex: "#F97316", label: "重複" },
  references:    { hex: "#6B7280", label: "參考" },
  supersedes:    { hex: "#A855F7", label: "取代" },
  related_to:    { hex: "#22C55E", label: "相關" },
};

// ─── confidence badge 工具函式 ────────────────────────────────────────────────

function getConfidenceBadgeStyle(confidence: number): {
  bg: string;
  text: string;
} {
  if (confidence >= 0.8) return { bg: "bg-green-100", text: "text-green-700" };
  if (confidence >= 0.5) return { bg: "bg-yellow-100", text: "text-yellow-700" };
  return { bg: "bg-red-100", text: "text-red-700" };
}

// ─── AISuggestionChip ────────────────────────────────────────────────────────

interface AISuggestionChipProps {
  link_type: LinkType;
  targetTitle: string;
  targetId: string;
  relation?: string;
  confidence: number;
  status: SuggestionStatus;
  onAccept?: () => void;
  onReject?: () => void;
  onTitleClick?: (id: string) => void;
}

export function AISuggestionChip({
  link_type,
  targetTitle,
  targetId,
  relation,
  confidence,
  status,
  onAccept,
  onReject,
  onTitleClick,
}: AISuggestionChipProps) {
  const linkConfig = LINK_TYPE_CONFIG[link_type];
  const confidenceStyle = getConfidenceBadgeStyle(confidence);
  const confidencePercent = Math.round(confidence * 100);

  // 狀態別樣式
  const containerStyles = {
    pending:  "bg-blue-50 border-blue-200",
    accepted: "bg-green-50 border-green-200",
    rejected: "bg-neutral-50 border-neutral-200",
  };

  // 狀態別圖示
  const StatusIcon = {
    pending:  <Sparkles className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />,
    accepted: <Check    className="h-3.5 w-3.5 text-green-600 flex-shrink-0" aria-hidden="true" />,
    rejected: <X        className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" aria-hidden="true" />,
  };

  // a11y label
  const statusLabel = {
    pending:  `，信心值 ${confidencePercent}%，待決`,
    accepted: "，已接受",
    rejected: "，已拒絕",
  };
  const chipAriaLabel = `${linkConfig.label} 建議至 ${targetTitle}${statusLabel[status]}`;

  return (
    <div
      role="listitem"
      aria-label={chipAriaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border",
        "text-sm transition-all duration-150 motion-reduce:transition-none",
        "animate-in fade-in slide-in-from-top-1",
        containerStyles[status],
        status === "rejected" && "opacity-60"
      )}
    >
      {/* 狀態圖示 */}
      {StatusIcon[status]}

      {/* link_type badge */}
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-normal text-white flex-shrink-0"
        style={{ backgroundColor: linkConfig.hex }}
      >
        {linkConfig.label}
      </span>

      {/* target title */}
      <button
        role="link"
        aria-label={`前往：${targetTitle}`}
        onClick={() => onTitleClick?.(targetId)}
        className={cn(
          "text-sm max-w-[180px] truncate cursor-pointer",
          "underline-offset-2 hover:underline",
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:rounded",
          status === "rejected" && "line-through text-muted-foreground",
          status === "pending" && "text-foreground",
          status === "accepted" && "text-muted-foreground"
        )}
      >
        {targetTitle}
      </button>

      {/* relation text */}
      {relation && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          · {relation}
        </span>
      )}

      {/* confidence badge */}
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-normal flex-shrink-0",
          confidenceStyle.bg,
          confidenceStyle.text
        )}
      >
        {confidencePercent}%
      </span>

      {/* Accept / Reject 按鈕（pending 時顯示）*/}
      {status === "pending" && (
        <div className="flex items-center gap-0.5 ml-0.5" role="group" aria-label="操作">
          <button
            onClick={onAccept}
            aria-label={`接受建議：${targetTitle}`}
            className={cn(
              "p-1.5 rounded-full transition-colors duration-150 motion-reduce:transition-none",
              "hover:bg-green-100 hover:text-green-600",
              "min-w-[32px] min-h-[32px] flex items-center justify-center",
              "focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:outline-none"
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={onReject}
            aria-label={`拒絕建議：${targetTitle}`}
            className={cn(
              "p-1.5 rounded-full transition-colors duration-150 motion-reduce:transition-none",
              "hover:bg-red-100 hover:text-red-600",
              "min-w-[32px] min-h-[32px] flex items-center justify-center",
              "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
            )}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AISuggestionList ─────────────────────────────────────────────────────────

interface AISuggestionListProps {
  suggestions: AISuggestion[];
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onTitleClick: (id: string) => void;
}

export function AISuggestionList({
  suggestions,
  onAcceptAll,
  onRejectAll,
  onAccept,
  onReject,
  onTitleClick,
}: AISuggestionListProps) {
  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const hasPending = pendingCount > 0;
  const allDone = suggestions.length > 0 && pendingCount === 0;

  return (
    <section aria-label="AI 建議連結">
      {/* 標題行 */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            AI 建議連結
          </h3>
        </div>

        {/* pending 數量 badge */}
        {hasPending && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-blue-600 bg-blue-100">
            {pendingCount} 待決
          </span>
        )}

        {/* 批次操作（有 pending 時顯示）*/}
        {hasPending && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={onAcceptAll}
              aria-label="接受所有 AI 建議"
              className={cn(
                "text-xs text-green-600 hover:text-green-700 hover:underline",
                "px-2 py-1 rounded transition-colors",
                "focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:outline-none",
                "min-h-[32px]"
              )}
            >
              全部接受
            </button>
            <button
              onClick={onRejectAll}
              aria-label="拒絕所有 AI 建議"
              className={cn(
                "text-xs text-red-600 hover:text-red-700 hover:underline",
                "px-2 py-1 rounded transition-colors",
                "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none",
                "min-h-[32px]"
              )}
            >
              全部拒絕
            </button>
          </div>
        )}
      </div>

      {/* aria-live 通知區 */}
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {allDone && "所有 AI 建議已處理完畢"}
      </div>

      {/* Chip 列表 / 空白狀態 */}
      {allDone ? (
        <p className="text-sm text-muted-foreground">所有建議已處理</p>
      ) : (
        <ul role="list" aria-label="AI 建議連結列表" className="flex flex-col gap-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} className="contents">
              <AISuggestionChip
                link_type={suggestion.link_type}
                targetId={suggestion.targetId}
                targetTitle={suggestion.targetTitle}
                relation={suggestion.relation}
                confidence={suggestion.confidence}
                status={suggestion.status}
                onAccept={() => onAccept(suggestion.id)}
                onReject={() => onReject(suggestion.id)}
                onTitleClick={onTitleClick}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── 狀態管理 hook（工具）────────────────────────────────────────────────────

export function useAISuggestions(initialSuggestions: AISuggestion[]) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(initialSuggestions);

  const accept = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "accepted" } : s))
    );
  }, []);

  const reject = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s))
    );
  }, []);

  const acceptAll = useCallback(() => {
    setSuggestions((prev) =>
      prev.map((s) => (s.status === "pending" ? { ...s, status: "accepted" } : s))
    );
  }, []);

  const rejectAll = useCallback(() => {
    setSuggestions((prev) =>
      prev.map((s) => (s.status === "pending" ? { ...s, status: "rejected" } : s))
    );
  }, []);

  return { suggestions, accept, reject, acceptAll, rejectAll };
}

// ─── 示範：三種狀態 ─────────────────────────────────────────────────────────

export function AISuggestionChipDemo() {
  const { suggestions, accept, reject, acceptAll, rejectAll } = useAISuggestions([
    {
      id: "s1",
      link_type: "derives_from",
      targetId: "e1",
      targetTitle: "機器學習基礎",
      relation: "概念衍生",
      confidence: 0.92,
      status: "pending",
    },
    {
      id: "s2",
      link_type: "references",
      targetId: "e2",
      targetTitle: "深度學習論文 2024",
      confidence: 0.65,
      status: "pending",
    },
    {
      id: "s3",
      link_type: "contradicts",
      targetId: "e3",
      targetTitle: "傳統統計方法",
      confidence: 0.41,
      status: "pending",
    },
  ]);

  return (
    <div className="max-w-md p-4 space-y-2">
      <AISuggestionList
        suggestions={suggestions}
        onAccept={accept}
        onReject={reject}
        onAcceptAll={acceptAll}
        onRejectAll={rejectAll}
        onTitleClick={(id) => console.log("navigate to", id)}
      />
    </div>
  );
}

// ─── 個別狀態範例 ─────────────────────────────────────────────────────────────

// pending 狀態
export const PendingExample = (
  <AISuggestionChip
    link_type="derives_from"
    targetId="e1"
    targetTitle="機器學習基礎"
    relation="概念衍生"
    confidence={0.92}
    status="pending"
    onAccept={() => {}}
    onReject={() => {}}
    onTitleClick={() => {}}
  />
);

// accepted 狀態
export const AcceptedExample = (
  <AISuggestionChip
    link_type="references"
    targetId="e2"
    targetTitle="深度學習論文"
    confidence={0.78}
    status="accepted"
    onTitleClick={() => {}}
  />
);

// rejected 狀態
export const RejectedExample = (
  <AISuggestionChip
    link_type="contradicts"
    targetId="e3"
    targetTitle="傳統統計方法"
    confidence={0.41}
    status="rejected"
    onTitleClick={() => {}}
  />
);
