"use client";

import { useMemo } from "react";

const TIMEZONE = "Asia/Taipei";

/**
 * 以瀏覽器 Intl.DateTimeFormat 取得今日日期（Asia/Taipei 時區）。
 * 回傳 YYYY-MM-DD 格式字串，以及今日 00:00:00 的 ISO timestamp。
 *
 * 不自動追蹤日期變化；午夜後需手動 refresh 才會更新。
 */
export function useTodayDate() {
  return useMemo(() => {
    const now = new Date();

    // 取得 Asia/Taipei 的今日 YYYY-MM-DD
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(now)
      .split("-");

    // en-CA locale 輸出 YYYY-MM-DD 格式
    const today = parts.join("-");

    // 今日 00:00:00 的 Asia/Taipei 時間轉成 UTC ISO string
    const todayStartLocal = new Date(`${today}T00:00:00`);
    // 利用 Intl 計算 timezone offset
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // 直接用 midnight in UTC for the given local date
    // 計算 Asia/Taipei midnight 對應的 UTC 時刻
    const todayStart = getTodayStartISO(today);

    return { today, todayStart };
  }, []);
}

/**
 * 給定 YYYY-MM-DD（Asia/Taipei），回傳該日 00:00:00 Asia/Taipei 對應的 ISO UTC string。
 */
function getTodayStartISO(dateStr: string): string {
  // 建立一個「假裝」是 Taipei 當日 00:00 的時間點
  // 方式：在 UTC 建立時間後再加上 Taipei 的 offset（+8h）
  // 更精確方式：用 Date.parse 配合 timezone hint
  // Asia/Taipei 固定為 UTC+8
  const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
  const utcMidnight = new Date(`${dateStr}T00:00:00Z`);
  // Taipei midnight = UTC midnight - 8h offset
  const taipeiMidnightUTC = new Date(utcMidnight.getTime() - TAIPEI_OFFSET_MS);
  return taipeiMidnightUTC.toISOString();
}
