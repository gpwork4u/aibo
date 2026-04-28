"use client";

import { Sun } from "lucide-react";

interface TodayHeaderProps {
  today: string; // YYYY-MM-DD
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Taipei",
  }).format(date);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "早安";
  if (hour < 18) return "午安";
  return "晚安";
}

export function TodayHeader({ today }: TodayHeaderProps) {
  const displayDate = formatDisplayDate(today);
  const greeting = getGreeting();

  return (
    <div
      className="flex items-center gap-3 pb-6"
      data-testid="today-header"
    >
      <Sun className="h-6 w-6 text-amber-500 shrink-0" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{displayDate}</p>
      </div>
    </div>
  );
}
