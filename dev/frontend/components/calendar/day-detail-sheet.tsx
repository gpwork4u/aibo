"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, PlusCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import { useCalendarDay } from "@/lib/hooks/use-calendar-day";
import { useConvertGcalToEntry } from "@/lib/hooks/use-convert-gcal-to-entry";
import type {
  CalendarEntrySummary,
  CalendarEventSummary,
} from "@/lib/api/calendar";

interface DayDetailSheetProps {
  /** null/undefined 時 Sheet 關閉 */
  date: string | null;
  tz: string;
  onClose: () => void;
  includeGcal?: boolean;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

function formatDateLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return date;
  return DATE_FORMATTER.format(d);
}

function formatTimeRange(ev: CalendarEventSummary): string {
  if (ev.all_day) return "整天";
  const fmt = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  try {
    return `${fmt.format(new Date(ev.start))} – ${fmt.format(new Date(ev.end))}`;
  } catch {
    return "";
  }
}

/**
 * F-027c：點擊 day cell 後彈出的單日詳情 Sheet。
 *
 * 三區：
 *   - Entries：當日建立的知識條目
 *   - Events：Google Calendar 事件（含「轉成 entry」動作）
 *   - Journal：placeholder，留給 F-028 日記功能實作
 *
 * 錯誤處理統一由 use-convert-gcal-to-entry 的 toast 處理。
 */
export function DayDetailSheet({
  date,
  tz,
  onClose,
  includeGcal = true,
}: DayDetailSheetProps) {
  const open = !!date;
  const { data, isLoading, isError, error } = useCalendarDay(date, {
    tz,
    includeGcal,
  });
  const convert = useConvertGcalToEntry();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onClose();
  };

  const day = data?.data;
  const entries: CalendarEntrySummary[] = day?.entries ?? [];
  const events: CalendarEventSummary[] = day?.events ?? [];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg"
        data-testid={CALENDAR_TESTIDS.sheet}
      >
        <SheetHeader>
          <SheetTitle>{date ? formatDateLabel(date) : "單日詳情"}</SheetTitle>
          <SheetDescription>
            查看當日新增的條目、Google Calendar 事件與日記。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              載入中…
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">
              載入失敗：
              {error instanceof Error ? error.message : "請稍後重試"}
            </p>
          )}

          {/* Entries 區 */}
          <section
            aria-labelledby="section-entries"
            data-testid={CALENDAR_TESTIDS.sheetSectionEntries}
          >
            <h3
              id="section-entries"
              className="text-sm font-semibold text-muted-foreground"
            >
              知識條目 ({entries.length})
            </h3>
            <div className="mt-2 space-y-2">
              {entries.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground">當日尚無條目。</p>
              )}
              {entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/entries/${entry.id}`}
                  className="block rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        entry.title ? "font-medium" : "italic text-muted-foreground"
                      }
                    >
                      {entry.title ?? "(無標題)"}
                    </span>
                    {entry.source_type && (
                      <Badge variant="outline" className="text-[10px]">
                        {entry.source_type}
                      </Badge>
                    )}
                  </div>
                  {entry.summary && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {entry.summary}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <Separator />

          {/* Events 區 */}
          <section
            aria-labelledby="section-events"
            data-testid={CALENDAR_TESTIDS.sheetSectionEvents}
          >
            <h3
              id="section-events"
              className="text-sm font-semibold text-muted-foreground"
            >
              Google Calendar 事件 ({events.length})
            </h3>
            <div className="mt-2 space-y-2">
              {day && !day.gcal_connected && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid={CALENDAR_TESTIDS.gcalNotConnectedBanner}
                >
                  尚未連接 Google Calendar —
                  <Link href="/settings" className="ml-1 underline">
                    前往設定
                  </Link>
                </p>
              )}
              {day?.degraded && day.gcal_connected && (
                <p
                  className="text-xs text-amber-600 dark:text-amber-400"
                  data-testid={CALENDAR_TESTIDS.gcalDegradedInlineWarning}
                >
                  Google Calendar 暫時無法存取，顯示可能不完整。
                </p>
              )}
              {events.length === 0 &&
                !isLoading &&
                day?.gcal_connected &&
                !day?.degraded && (
                  <p className="text-sm text-muted-foreground">當日無事件。</p>
                )}
              {events.map((ev) => {
                const pending =
                  convert.isPending && convert.variables?.gcalId === ev.gcal_id;
                return (
                  <div
                    key={ev.gcal_id}
                    className="rounded-md border px-3 py-2 text-sm"
                    data-testid={CALENDAR_TESTIDS.eventCard}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{ev.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeRange(ev)}
                        </p>
                      </div>
                      {ev.linked_entry_id ? (
                        <Link
                          href={`/entries/${ev.linked_entry_id}`}
                          data-testid={CALENDAR_TESTIDS.eventLinkedEntryLink}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          檢視 <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending || !date}
                          data-testid={CALENDAR_TESTIDS.eventToEntryButton}
                          onClick={() => {
                            if (!date) return;
                            convert.mutate({
                              gcalId: ev.gcal_id,
                              date,
                            });
                          }}
                        >
                          {pending ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <PlusCircle className="mr-1 h-3 w-3" />
                          )}
                          轉成條目
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Journal 區（F-028 實作） */}
          <section
            aria-labelledby="section-journal"
            data-testid={CALENDAR_TESTIDS.sheetSectionJournal}
          >
            <h3
              id="section-journal"
              className="text-sm font-semibold text-muted-foreground"
            >
              每日日記
            </h3>
            {day?.journal ? (
              <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <p className="text-muted-foreground">
                  已有日記（id: {day.journal.id}）。檢視與編輯功能於 F-028 日記 feature 上線後可用。
                </p>
              </div>
            ) : (
              <div className="mt-2 rounded-md border border-dashed px-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">尚未建立日記</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  日記撰寫功能將於 F-028 上線
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  disabled
                  data-testid={CALENDAR_TESTIDS.sheetWriteJournalButton}
                >
                  撰寫日記（即將推出）
                </Button>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
