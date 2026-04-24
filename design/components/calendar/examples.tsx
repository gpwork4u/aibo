/**
 * Sprint 8 行事曆 UI 元件 — 範例程式碼集合
 *
 * 目的：給 engineer F-027 參考的「markup + class」樣板，
 *       **不保證可直接執行**（部分 import / type / 子元件為示意）。
 *
 * 技術棧：
 *   - shadcn/ui（既有：button/badge/card/dialog/dropdown-menu/tooltip/popover…）
 *   - 新增：Sheet（components/ui/sheet.tsx）+ Tabs（components/ui/tabs.tsx）
 *   - Tailwind 3 + Radix
 *   - Lucide icons
 *   - date-fns（日期計算）
 *
 * 全繁體中文註解與文案。
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  LinkIcon,
  MoreHorizontalIcon,
  Loader2Icon,
  ArrowRightCircleIcon,
  ExternalLinkIcon,
  CalendarIcon,
  InfoIcon,
  XIcon,
  MapPinIcon,
  UsersIcon,
  ChevronRightIcon as ChevronRightSmallIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// 新增（engineer 需以 shadcn CLI 加入）：
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ------------------------------
// Types（簡化版；實際型別請放 lib/api/calendar.ts）
// ------------------------------
export type CalendarView = "month" | "week" | "day";

export interface EventSummary {
  gcal_id: string;
  summary: string;
  start: string;
  end: string;
  all_day: boolean;
  linked_entry_id: string | null;
  location?: string;
  description?: string;
  attendees?: string[];
  html_link?: string;
}

export interface EntrySummary {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  created_at: string;
  source_type: "manual" | "gcal" | "email" | "other";
  lifecycle_status?: "inbox" | "active" | "archived";
}

export interface CalendarDay {
  date: string;
  entry_count: number;
  event_count: number;
  has_journal: boolean;
  entries: EntrySummary[];
  events: EventSummary[];
  journal?: { id: string; mood: string; summary?: string } | null;
}

// ==============================
// 1. CalendarToolbar
// ==============================

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  timezone: string;
  hideViewTabs?: boolean;
}

export function CalendarToolbarExample({
  view,
  onViewChange,
  title,
  onPrev,
  onNext,
  onToday,
  timezone,
  hideViewTabs,
}: CalendarToolbarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-4 py-2">
      {/* 左側：導覽按鈕群 */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onPrev} aria-label="前一個期間">
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNext} aria-label="後一個期間">
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday} title="今天（T）">
          今天
        </Button>
      </div>

      {/* 中間：標題 */}
      <h2 className="flex-1 text-base font-semibold tabular-nums" aria-live="polite">
        {title}
      </h2>

      {/* 右側：view Tabs + timezone */}
      {!hideViewTabs && (
        <div
          role="tablist"
          aria-label="行事曆檢視"
          className="inline-flex items-center rounded-md border bg-muted p-0.5 text-sm"
        >
          {(["month", "week", "day"] as CalendarView[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => onViewChange(v)}
              className={cn(
                "rounded px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
              title={v === "month" ? "月檢視（M）" : v === "week" ? "週檢視（W）" : "日檢視（D）"}
            >
              {v === "month" ? "月" : v === "week" ? "週" : "日"}
            </button>
          ))}
        </div>
      )}

      <span className="hidden text-xs text-muted-foreground sm:inline" title={timezone}>
        {timezone}
      </span>
    </div>
  );
}

// ==============================
// 2. DayCell（MonthView 用）
// ==============================

interface DayCellProps {
  day: CalendarDay;
  isToday: boolean;
  isSelected: boolean;
  isOutsideMonth: boolean;
  onSelect: () => void;
}

export function DayCellExample({ day, isToday, isSelected, isOutsideMonth, onSelect }: DayCellProps) {
  const shown = day.events.slice(0, 2);
  const more = Math.max(0, day.events.length - shown.length);
  const dateNum = parseInt(day.date.slice(-2), 10);
  const ariaLabel =
    `${day.date}，${day.entry_count} 條目，${day.event_count} 事件` +
    (day.has_journal ? "，有日記" : "");

  return (
    <button
      role="gridcell"
      aria-label={ariaLabel}
      aria-selected={isSelected}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-[112px] flex-col gap-1 p-1.5 text-left transition-colors",
        "bg-card hover:bg-muted/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isOutsideMonth && "bg-muted/30 text-muted-foreground/60",
        isToday && "ring-1 ring-inset ring-primary/50",
        isSelected && "bg-primary/10 ring-2 ring-inset ring-primary",
      )}
    >
      {/* Header：日期 + entry count + journal icon */}
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            isToday &&
              "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground",
          )}
        >
          {dateNum}
        </span>
        {day.entry_count > 0 && (
          <Badge variant="secondary" className="h-4 rounded-full px-1 text-[10px]">
            {day.entry_count}
          </Badge>
        )}
        {day.has_journal && <BookOpenIcon className="ml-auto h-3 w-3 text-primary" aria-hidden />}
      </div>

      {/* Event chips */}
      <div className="space-y-0.5">
        {shown.map((ev) => (
          <EventChipInline key={ev.gcal_id} event={ev} />
        ))}
        {more > 0 && <span className="text-[10px] text-muted-foreground">+{more} 更多</span>}
      </div>
    </button>
  );
}

function EventChipInline({ event }: { event: EventSummary }) {
  const startStr = event.all_day ? "" : format(new Date(event.start), "HH:mm");
  return (
    <div
      className={cn(
        "flex items-center gap-1 truncate rounded-sm px-1 py-0.5 text-[11px]",
        event.linked_entry_id
          ? "border border-success/30 bg-success/10"
          : "border border-dashed border-border bg-muted/60",
      )}
      title={`${startStr} ${event.summary}`}
    >
      {event.all_day ? (
        <Badge variant="outline" className="h-4 px-1 text-[9px]">
          全天
        </Badge>
      ) : (
        <span className="shrink-0 tabular-nums text-muted-foreground">{startStr}</span>
      )}
      <span className="truncate">{event.summary}</span>
      {event.linked_entry_id && <LinkIcon className="h-3 w-3 shrink-0 text-success" />}
    </div>
  );
}

// ==============================
// 3. MonthGrid 骨架
// ==============================

export function MonthGridExample({
  daysMap,
  anchorDate,
  selectedDate,
  onSelectDate,
}: {
  daysMap: Map<string, CalendarDay>;
  anchorDate: Date;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}) {
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  // 假設 cells 已由 engineer 用 date-fns 計算出 42 格
  const cells: Array<{ date: string; isOutsideMonth: boolean }> = []; // 示意

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div role="grid" aria-label="月視圖" className="overflow-hidden rounded-md border">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 bg-muted/30 text-xs font-medium text-muted-foreground">
        {weekdays.map((w, i) => (
          <div
            key={w}
            role="columnheader"
            className={cn("py-2 text-center", i >= 5 && "text-muted-foreground/80")}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 42 DayCells */}
      <div className="grid grid-cols-7 gap-px bg-border">
        {cells.map((c) => {
          const d = daysMap.get(c.date) ?? {
            date: c.date,
            entry_count: 0,
            event_count: 0,
            has_journal: false,
            entries: [],
            events: [],
          };
          return (
            <DayCellExample
              key={c.date}
              day={d}
              isToday={c.date === todayStr}
              isSelected={c.date === selectedDate}
              isOutsideMonth={c.isOutsideMonth}
              onSelect={() => onSelectDate(c.date)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ==============================
// 4. EntryMiniCard
// ==============================

export function EntryMiniCardExample({ entry, onClick }: { entry: EntrySummary; onClick: () => void }) {
  const sourceLabel = { manual: "手動", gcal: "Gcal", email: "Email", other: "其他" }[entry.source_type];
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium">
          {entry.title || <span className="italic text-muted-foreground">(無標題)</span>}
        </h4>
        {entry.summary && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.summary}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {entry.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="outline" className="h-4 px-1 text-[10px]">
              #{t}
            </Badge>
          ))}
          {entry.tags.length > 3 && <span className="text-[10px]">+{entry.tags.length - 3}</span>}
          <span className="ml-auto tabular-nums">{format(new Date(entry.created_at), "HH:mm")}</span>
          <Badge
            className={cn(
              "h-4 text-[10px]",
              entry.source_type === "gcal"
                ? "border-success/30 bg-success/15 text-foreground"
                : "",
            )}
            variant={entry.source_type === "manual" ? "secondary" : "outline"}
          >
            {sourceLabel}
          </Badge>
          {entry.lifecycle_status === "inbox" && (
            <Badge variant="outline" className="h-4 border-warning/40 text-[10px]">
              收件匣
            </Badge>
          )}
        </div>
      </div>
      <ChevronRightSmallIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ==============================
// 5. EventCard + EventActionMenu
// ==============================

export function EventCardExample({
  event,
  isConverting,
  onConvert,
  onOpenLinkedEntry,
}: {
  event: EventSummary;
  isConverting?: boolean;
  onConvert: () => void;
  onOpenLinkedEntry?: () => void;
}) {
  const startStr = format(new Date(event.start), "HH:mm");
  const endStr = format(new Date(event.end), "HH:mm");
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        event.linked_entry_id
          ? "border-success/30 bg-success/5"
          : "border-dashed border-border bg-muted/30",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {event.all_day ? "全天" : `${startStr} – ${endStr}`}
        </span>
        {event.all_day && (
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            全天
          </Badge>
        )}
      </div>
      <h4 className="mt-1 font-medium leading-snug">{event.summary}</h4>

      {event.location && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon className="h-3.5 w-3.5" />
          <span className="truncate">{event.location}</span>
        </p>
      )}
      {event.attendees && event.attendees.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <UsersIcon className="h-3.5 w-3.5" />
          <span className="truncate">
            {event.attendees.slice(0, 3).join("、")}
            {event.attendees.length > 3 && ` +${event.attendees.length - 3}`}
          </span>
        </p>
      )}
      {event.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{event.description}</p>}

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
        {event.linked_entry_id ? (
          <button
            onClick={onOpenLinkedEntry}
            className="inline-flex items-center gap-1 rounded text-xs text-success hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LinkIcon className="h-3 w-3" /> 已連結 → Entry
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">尚未轉成 entry</span>
        )}
        <EventActionMenuExample
          event={event}
          isConverting={isConverting}
          disabled={!!event.linked_entry_id}
          onConvert={onConvert}
        />
      </div>
    </div>
  );
}

function EventActionMenuExample({
  event,
  isConverting,
  disabled,
  onConvert,
}: {
  event: EventSummary;
  isConverting?: boolean;
  disabled?: boolean;
  onConvert: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="事件動作選單"
          aria-busy={isConverting}
          disabled={isConverting}
        >
          {isConverting ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontalIcon className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onConvert} disabled={disabled}>
          <ArrowRightCircleIcon className="mr-2 h-4 w-4" />
          轉成 entry
        </DropdownMenuItem>
        {event.linked_entry_id && (
          <DropdownMenuItem asChild>
            <Link href={`/entries/${event.linked_entry_id}`}>
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              檢視已連結的 entry
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={event.html_link ?? "#"} target="_blank" rel="noreferrer">
            <CalendarIcon className="mr-2 h-4 w-4" />
            在 Google Calendar 開啟
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ==============================
// 6. GcalBanner
// ==============================

export function GcalBannerExample({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 border-b bg-primary/5 px-4 py-2 text-sm"
    >
      <InfoIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <p className="flex-1">尚未連接 Google Calendar，目前僅顯示知識條目。</p>
      <Button asChild variant="link" size="sm" className="h-auto p-0">
        <Link href="/settings">前往設定 →</Link>
      </Button>
      <button
        onClick={onDismiss}
        aria-label="關閉提示"
        className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==============================
// 7. DayDetailSheet（骨架；Sheet import 需 engineer 補）
// ==============================

/*
export function DayDetailSheetExample(props: DayDetailSheetProps) {
  const { open, onOpenChange, date, data, isLoading, onConvertEvent, onCreateJournal, onOpenEntry } = props;
  const entries = data?.entries ?? [];
  const events = data?.events ?? [];
  const journal = data?.journal;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:w-[480px]">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-lg">{format(new Date(date), "PPPP", { locale: zhTW })}</SheetTitle>
          <SheetDescription>
            共 {entries.length} 條目 · {events.length} 事件
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section aria-labelledby="sec-journal">
            <h3 id="sec-journal" className="mb-2 text-sm font-semibold text-muted-foreground">日記</h3>
            {journal ? (
              <div className="rounded-md border-l-2 border-primary bg-muted/30 p-3 text-sm">
                <p className="font-medium">{journal.mood}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{journal.summary}</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="h-4 w-4" /> 尚未撰寫日記
                </div>
                <Button onClick={onCreateJournal} size="sm" className="w-full">寫今天的日記</Button>
              </div>
            )}
          </section>

          <Separator />

          <section aria-labelledby="sec-entries">
            <h3 id="sec-entries" className="mb-2 text-sm font-semibold text-muted-foreground">
              條目（{entries.length}）
            </h3>
            {isLoading ? (
              <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">載入中…</p>
            ) : entries.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">這一天沒有新增條目</p>
            ) : (
              <div className="space-y-2">
                {entries.map((e) => (
                  <EntryMiniCardExample key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />
                ))}
              </div>
            )}
          </section>

          <Separator />

          <section aria-labelledby="sec-events">
            <h3 id="sec-events" className="mb-2 text-sm font-semibold text-muted-foreground">
              Google Calendar 事件（{events.length}）
            </h3>
            {events.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">這一天沒有 Google Calendar 事件</p>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <EventCardExample key={ev.gcal_id} event={ev} onConvert={() => onConvertEvent(ev.gcal_id)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
*/

// ==============================
// 8. EventBlock（Week/Day 時間軸用）
// ==============================

export function EventBlockExample({
  event,
  top,
  height,
  onClick,
}: {
  event: EventSummary;
  top: number;
  height: number;
  onClick: () => void;
}) {
  const startStr = format(new Date(event.start), "HH:mm");
  const endStr = format(new Date(event.end), "HH:mm");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${event.summary}，${startStr}–${endStr}${event.linked_entry_id ? "，已連結 entry" : ""}`}
      style={{ top, height }}
      className={cn(
        "absolute left-1 right-1 flex flex-col gap-0.5 overflow-hidden rounded-sm border px-1.5 py-1 text-left text-[11px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        event.linked_entry_id
          ? "border-success/40 bg-success/10 hover:bg-success/20"
          : "border-dashed border-border bg-muted/60 hover:bg-muted",
      )}
    >
      <span className="tabular-nums text-muted-foreground">
        {startStr}–{endStr}
      </span>
      <span className="truncate font-medium">{event.summary}</span>
      {event.linked_entry_id && (
        <LinkIcon className="absolute right-1 top-1 h-3 w-3 text-success" aria-hidden />
      )}
    </button>
  );
}
