"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { CALENDAR_TESTIDS } from "@/lib/calendar/testids";
import { cn } from "@/lib/utils";

export type GcalBannerMode = "not-connected" | "degraded";

export interface GcalBannerProps {
  mode: GcalBannerMode;
  className?: string;
}

export function GcalBanner({ mode, className }: GcalBannerProps) {
  if (mode === "not-connected") {
    return (
      <div
        data-testid={CALENDAR_TESTIDS.gcalNotConnectedBanner}
        role="status"
        className={cn(
          "flex items-center gap-2 rounded-md border border-dashed border-warning/50 bg-warning/10 px-3 py-2 text-sm text-foreground",
          className,
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-warning" />
        <span className="flex-1">
          尚未連接 Google Calendar，行事曆僅顯示知識條目。
        </span>
        <Link
          href="/settings"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          前往設定
        </Link>
      </div>
    );
  }
  // degraded
  return (
    <div
      data-testid={CALENDAR_TESTIDS.gcalDegradedInlineWarning}
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-foreground",
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <span className="flex-1">
        Google Calendar 暫時無法載入，僅顯示知識條目。
      </span>
    </div>
  );
}
