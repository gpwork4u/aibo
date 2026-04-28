"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchCalendarDay } from "@/lib/api/calendar-day";
import { getGcalStatus } from "@/lib/api/gcal-settings";
import type { CalendarEventSummary } from "@/lib/api/calendar";

interface CalendarSectionProps {
  today: string; // YYYY-MM-DD
}

function formatEventTime(event: CalendarEventSummary): string {
  if (event.all_day) return "全天";
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function CalendarSection({ today }: CalendarSectionProps) {
  // 先查 gcal 連線狀態
  const { data: gcalStatus, isLoading: gcalLoading } = useQuery({
    queryKey: ["gcal", "status"],
    queryFn: () => getGcalStatus(),
    staleTime: 60_000,
  });

  const gcalConnected = gcalStatus?.connected === true;

  // 只有 gcal 連線後才抓事件
  const {
    data: dayResult,
    isLoading: dayLoading,
    error: dayError,
  } = useQuery({
    queryKey: ["calendar-day", today],
    queryFn: () =>
      fetchCalendarDay(today, "Asia/Taipei", { includeGcal: true }),
    enabled: gcalConnected,
    staleTime: 60_000,
  });

  // GCal 未連線：直接不顯示（條件渲染，非 error）
  if (!gcalLoading && !gcalConnected) {
    return null;
  }

  const isLoading = gcalLoading || (gcalConnected && dayLoading);
  const events = dayResult?.data?.events ?? [];

  return (
    <Card data-testid="calendar-section">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4" />
          今日行程
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div
            className="text-xs text-muted-foreground animate-pulse"
            data-testid="calendar-loading"
          >
            載入中…
          </div>
        )}

        {dayError && !isLoading && (
          <div
            className="flex items-center gap-2 text-xs text-destructive"
            data-testid="calendar-error"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Could not load calendar</span>
          </div>
        )}

        {!isLoading && !dayError && events.length === 0 && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="calendar-empty"
          >
            今天沒有行程
          </p>
        )}

        {!isLoading && !dayError && events.length > 0 && (
          <ul className="space-y-2" data-testid="calendar-events">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start gap-2 text-sm"
                data-testid="calendar-event-item"
              >
                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEventTime(event)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
