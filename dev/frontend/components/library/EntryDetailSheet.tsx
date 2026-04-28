"use client";

/**
 * F-041 EntryDetailSheet
 * 點選 Library row → 右側 Sheet 展開，顯示完整 entry 詳情
 */

import { useEntry } from "@/lib/hooks/use-entries";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { EntryListItem } from "@/lib/api/entries";
import { RelationsSection } from "@/components/relation-editor/relations-section";

interface EntryDetailSheetProps {
  entry: EntryListItem | null;
  open: boolean;
  onClose: () => void;
}

export function EntryDetailSheet({ entry, open, onClose }: EntryDetailSheetProps) {
  const { data: detail, isLoading } = useEntry(open && entry ? entry.id : null);

  const displayEntry = detail ?? entry;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[480px] sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0"
        data-testid="entry-detail-sheet"
      >
        {isLoading && !displayEntry && (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[--fg-muted]" />
          </div>
        )}

        {displayEntry && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4">
              <SheetTitle
                className="text-lg font-semibold leading-snug text-[--fg]"
                data-testid="entry-detail-title"
              >
                {displayEntry.title || "（無標題）"}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {/* 狀態 */}
                  {"lifecycle_status" in displayEntry && (
                    <Badge variant="secondary">
                      {(displayEntry as EntryListItem).lifecycle_status ?? "library"}
                    </Badge>
                  )}
                  {/* confidence */}
                  <span className="text-xs text-[--fg-muted]">
                    Confidence:{" "}
                    <strong>
                      {Math.round(displayEntry.confidence * 100)}%
                    </strong>
                  </span>
                  {/* updated_at */}
                  <span className="text-xs text-[--fg-muted]">
                    更新：{formatRelativeTime(displayEntry.updated_at)}
                  </span>
                </div>
              </SheetDescription>
            </SheetHeader>

            <Separator />

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Tags */}
              {displayEntry.tags && displayEntry.tags.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[--fg-muted]">
                    標籤
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayEntry.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Domains */}
              {displayEntry.domains && displayEntry.domains.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[--fg-muted]">
                    分類
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayEntry.domains.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Summary */}
              {"summary" in displayEntry && (displayEntry as { summary?: string | null }).summary && (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[--fg-muted]">
                    摘要
                  </h3>
                  <p className="text-sm text-[--fg] leading-relaxed whitespace-pre-wrap">
                    {(displayEntry as { summary?: string | null }).summary}
                  </p>
                </section>
              )}

              {/* Content */}
              {"content" in displayEntry && (displayEntry as { content?: string | null }).content && (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[--fg-muted]">
                    內容
                  </h3>
                  <p className="text-sm text-[--fg] leading-relaxed whitespace-pre-wrap">
                    {(displayEntry as { content?: string | null }).content}
                  </p>
                </section>
              )}

              {/* content_preview for EntryListItem */}
              {"content_preview" in displayEntry &&
                (displayEntry as EntryListItem).content_preview &&
                !("content" in displayEntry && (displayEntry as { content?: string | null }).content) && (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[--fg-muted]">
                    預覽
                  </h3>
                  <p className="text-sm text-[--fg] leading-relaxed whitespace-pre-wrap">
                    {(displayEntry as EntryListItem).content_preview}
                  </p>
                </section>
              )}

              {/* Relations */}
              {detail && (
                <RelationsSection entryId={detail.id} />
              )}

              {/* Metadata */}
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[--fg-muted]">
                  Metadata
                </h3>
                <dl className="space-y-1.5 text-xs text-[--fg-muted]">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium">ID</dt>
                    <dd className="font-mono truncate">{displayEntry.id}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium">建立時間</dt>
                    <dd>{formatRelativeTime(displayEntry.created_at)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium">更新時間</dt>
                    <dd>{formatRelativeTime(displayEntry.updated_at)}</dd>
                  </div>
                  {"source_type" in displayEntry && (displayEntry as EntryListItem).source_type && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-medium">來源</dt>
                      <dd>{(displayEntry as EntryListItem).source_type}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium">Confirmations</dt>
                    <dd>{displayEntry.confirmations}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
