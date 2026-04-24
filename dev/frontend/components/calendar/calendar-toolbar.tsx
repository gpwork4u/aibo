"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week" | "day";

export interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** 例：Asia/Taipei */
  timezone: string;
  /** 是否隱藏 view Tabs（mobile < 768px 強制 day view）。 */
  hideViewTabs?: boolean;
  isLoading?: boolean;
}

export function CalendarToolbar({
  view,
  onViewChange,
  title,
  onPrev,
  onNext,
  onToday,
  timezone,
  hideViewTabs = false,
  isLoading = false,
}: CalendarToolbarProps) {
  const prevLabel =
    view === "month" ? "前一個月" : view === "week" ? "前一週" : "前一天";
  const nextLabel =
    view === "month" ? "後一個月" : view === "week" ? "後一週" : "後一天";

  return (
    <div
      data-testid={CALENDAR_TESTIDS.toolbar}
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 py-2",
        isLoading && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrev}
          disabled={isLoading}
          aria-label={prevLabel}
          data-testid={CALENDAR_TESTIDS.prevButton}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={isLoading}
          aria-label={nextLabel}
          data-testid={CALENDAR_TESTIDS.nextButton}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          disabled={isLoading}
          title="T"
          aria-label="回到今天"
          data-testid={CALENDAR_TESTIDS.todayButton}
        >
          今天
        </Button>
      </div>

      <h2
        aria-live="polite"
        className="text-base font-semibold tabular-nums"
        data-testid={CALENDAR_TESTIDS.toolbarTitle}
      >
        {title}
      </h2>

      <div className="flex items-center gap-3">
        {!hideViewTabs && (
          <Tabs
            value={view}
            onValueChange={(v) => onViewChange(v as CalendarView)}
            data-testid={CALENDAR_TESTIDS.viewTabs}
          >
            <TabsList>
              <TabsTrigger
                value="month"
                data-testid={CALENDAR_TESTIDS.viewTabMonth}
                title="M"
              >
                月
              </TabsTrigger>
              <TabsTrigger
                value="week"
                data-testid={CALENDAR_TESTIDS.viewTabWeek}
                title="W"
              >
                週
              </TabsTrigger>
              <TabsTrigger
                value="day"
                data-testid={CALENDAR_TESTIDS.viewTabDay}
                title="D"
              >
                日
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <span
          className="hidden text-xs text-muted-foreground sm:inline"
          title={timezone}
        >
          {timezone}
        </span>
      </div>
    </div>
  );
}
