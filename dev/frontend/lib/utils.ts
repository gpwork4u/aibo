import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date string as a locale date-time for display.
 * Falls back to the raw value if parsing fails.
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an ISO date string as a relative time (e.g. "5 分鐘前", "2 天前").
 * Falls back to a short date string for distant values.
 */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return "剛剛";
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return `${Math.abs(min)} 分鐘${min >= 0 ? "前" : "後"}`;
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return `${Math.abs(hr)} 小時${hr >= 0 ? "前" : "後"}`;
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 7) return `${Math.abs(day)} 天${day >= 0 ? "前" : "後"}`;
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
