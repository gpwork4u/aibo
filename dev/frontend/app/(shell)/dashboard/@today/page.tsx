"use client";

import Link from "next/link";
import { Sun, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTodayDate } from "@/lib/hooks/use-today-date";

/**
 * Dashboard @today slot — 精簡預覽，連結至完整 Today Dashboard（/today）。
 * F-042 Sprint 14
 */
export default function TodaySlot() {
  const { today } = useTodayDate();

  const displayDate = new Intl.DateTimeFormat("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(`${today}T12:00:00`));

  return (
    <Card data-testid="slot-today">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sun className="h-4 w-4 text-amber-500" />
          Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{displayDate}</p>
        <Button asChild variant="ghost" size="sm" className="w-full justify-between">
          <Link href="/today">
            開啟 Today Dashboard
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
