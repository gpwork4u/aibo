// InboxCard 使用範例
// 依賴：shadcn/ui Card / Checkbox / Badge / Button、Lucide Icons

import { Archive, BookmarkPlus, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface InboxEntry {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  source: string;
  createdAt: string;
  classificationStatus: "draft" | "classifying" | "classified";
}

interface InboxCardProps {
  entry: InboxEntry;
  isActive?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
  onSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClassify?: (id: string) => void;
  onMoveToLibrary?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

const statusBadgeConfig = {
  draft: { variant: "secondary" as const, label: "草稿" },
  classifying: { variant: "outline" as const, label: "分類中" },
  classified: { variant: "default" as const, label: "已分類" },
};

function InboxCard({
  entry,
  isActive = false,
  isSelected = false,
  isLoading = false,
  onSelect,
  onArchive,
  onDelete,
  onClassify,
  onMoveToLibrary,
  onClick,
  className,
}: InboxCardProps) {
  const badgeConfig = statusBadgeConfig[entry.classificationStatus];
  const formattedDate = new Date(entry.createdAt).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
  });

  return (
    <Card
      role="article"
      aria-label={entry.title}
      aria-current={isActive || undefined}
      aria-busy={isLoading || undefined}
      tabIndex={0}
      className={cn(
        "group relative cursor-pointer select-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isActive && "border-l-[3px] border-l-primary bg-accent/30",
        isSelected && "bg-accent/20",
        !isActive && !isSelected && "hover:bg-accent/10",
        className
      )}
      onClick={() => onClick?.(entry.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick?.(entry.id);
        if (e.key === " ") { e.preventDefault(); onSelect?.(entry.id); }
      }}
    >
      <CardContent className="flex items-start gap-3 px-4 py-3 min-h-[80px]">
        {/* Checkbox */}
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Checkbox
            checked={isSelected}
            aria-label={`Select ${entry.title}`}
            onClick={(e) => { e.stopPropagation(); onSelect?.(entry.id); }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium leading-tight line-clamp-1 text-foreground">
              {entry.title}
            </h3>
            <Badge variant={badgeConfig.variant} className="shrink-0 text-xs">
              {entry.classificationStatus === "classifying" && (
                <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
              )}
              {badgeConfig.label}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {entry.summary}
          </p>

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="標籤">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs px-1.5 py-0 mr-1">
                {entry.source}
              </Badge>
              {formattedDate}
            </span>

            {/* Action Buttons（hover 浮現） */}
            <div
              className={cn(
                "flex items-center gap-0.5 transition-opacity duration-150",
                "opacity-0 group-hover:opacity-100",
                isLoading && "pointer-events-none"
              )}
              aria-hidden={isLoading}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Archive entry"
                onClick={(e) => { e.stopPropagation(); onArchive?.(entry.id); }}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move to library"
                onClick={(e) => { e.stopPropagation(); onMoveToLibrary?.(entry.id); }}
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Classify entry"
                onClick={(e) => { e.stopPropagation(); onClassify?.(entry.id); }}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                aria-label="Delete entry"
                onClick={(e) => { e.stopPropagation(); onDelete?.(entry.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Shimmer Loading Overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 rounded-md bg-background/60 animate-pulse"
          aria-hidden="true"
        />
      )}
    </Card>
  );
}

// --- 使用範例 ---

// Default State
const sampleEntry: InboxEntry = {
  id: "entry-1",
  title: "React Server Components 最佳實踐",
  summary: "深入探討 RSC 的使用時機與效能考量，包含資料 fetching 策略與 bundle 大小最佳化。",
  tags: ["react", "frontend", "performance"],
  source: "manual",
  createdAt: new Date().toISOString(),
  classificationStatus: "classified",
};

export function DefaultCard() {
  return <InboxCard entry={sampleEntry} />;
}

// Active（鍵盤游標）
export function ActiveCard() {
  return <InboxCard entry={sampleEntry} isActive />;
}

// Selected（批次勾選）
export function SelectedCard() {
  return <InboxCard entry={{ ...sampleEntry, classificationStatus: "draft" }} isSelected />;
}

// Loading（Classify 進行中）
export function LoadingCard() {
  return <InboxCard entry={{ ...sampleEntry, classificationStatus: "classifying" }} isLoading />;
}

// No Tags
export function NoTagsCard() {
  return (
    <InboxCard
      entry={{ ...sampleEntry, tags: [], classificationStatus: "draft" }}
    />
  );
}

// Keyboard Navigation Demo（J/K list）
export function InboxCardList() {
  return (
    <div
      role="list"
      aria-label="Inbox 項目"
      className="space-y-1"
      // J/K navigation 由父層 InboxList 元件管理
    >
      <InboxCard entry={sampleEntry} isActive />
      <InboxCard entry={{ ...sampleEntry, id: "2", title: "TypeScript 5.0 新功能整理" }} />
      <InboxCard entry={{ ...sampleEntry, id: "3", title: "設計系統建構指南" }} isSelected />
    </div>
  );
}
