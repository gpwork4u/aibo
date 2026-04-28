import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTodayDate } from "@/lib/hooks/use-today-date";

describe("useTodayDate", () => {
  it("回傳 YYYY-MM-DD 格式的今日日期", () => {
    const { result } = renderHook(() => useTodayDate());
    const { today } = result.current;
    // 驗證格式：YYYY-MM-DD
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("回傳的 today 是有效日期", () => {
    const { result } = renderHook(() => useTodayDate());
    const { today } = result.current;
    const date = new Date(today + "T12:00:00");
    expect(isNaN(date.getTime())).toBe(false);
  });

  it("回傳的 todayStart 是 ISO 字串", () => {
    const { result } = renderHook(() => useTodayDate());
    const { todayStart } = result.current;
    // ISO UTC string: 2024-01-01T16:00:00.000Z（Asia/Taipei +8 → UTC）
    expect(todayStart).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("todayStart 對應 Asia/Taipei 當日 00:00（UTC+8 即 UTC -8h）", () => {
    const { result } = renderHook(() => useTodayDate());
    const { today, todayStart } = result.current;

    // Asia/Taipei 當日 00:00 = UTC 前一天 16:00
    const startDate = new Date(todayStart);
    // todayStart 的時間部分應該是 16:00:00 UTC（若當日未跨日）
    expect(startDate.getUTCHours()).toBe(16);
    expect(startDate.getUTCMinutes()).toBe(0);
    expect(startDate.getUTCSeconds()).toBe(0);

    // todayStart 的 UTC 日期 = today 的前一天（因為 UTC+8 午夜對應 UTC -8h）
    const utcDate = startDate.toISOString().split("T")[0];
    const dayBefore = new Date(today + "T12:00:00");
    dayBefore.setDate(dayBefore.getDate() - 1);
    const expectedUtcDate = dayBefore.toISOString().split("T")[0];
    expect(utcDate).toBe(expectedUtcDate);
  });

  it("多次呼叫回傳相同結果（useMemo 穩定性）", () => {
    const { result, rerender } = renderHook(() => useTodayDate());
    const first = result.current;
    rerender();
    const second = result.current;
    // 相同 render cycle 內應回傳相同的 today / todayStart
    expect(first.today).toBe(second.today);
    expect(first.todayStart).toBe(second.todayStart);
  });
});
