import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  addWeeks,
  buildMonthGridDays,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  formatYmd,
  fromYmdUtc,
  getMonthGridRange,
  getWeekRange,
  getZonedComponents,
  parseYmd,
  todayInTz,
} from "@/lib/calendar/date-utils";

describe("date-utils.formatYmd", () => {
  it("輸出該 tz 下的 YYYY-MM-DD（Asia/Taipei）", () => {
    // 2026-04-24 15:30 UTC → Asia/Taipei 2026-04-24 23:30
    const d = new Date("2026-04-24T15:30:00Z");
    expect(formatYmd(d, "Asia/Taipei")).toBe("2026-04-24");
  });

  it("跨日處理：2026-04-24T23:30+08:00（= 15:30Z）在 Asia/Taipei 為 04-24，在 UTC 為 04-24", () => {
    const d = new Date("2026-04-24T23:30:00+08:00");
    expect(formatYmd(d, "Asia/Taipei")).toBe("2026-04-24");
    expect(formatYmd(d, "UTC")).toBe("2026-04-24");
  });

  it("UTC 凌晨 01:00 在 Asia/Taipei 為當日 09:00（同日）", () => {
    const d = new Date("2026-04-24T01:00:00Z");
    expect(formatYmd(d, "Asia/Taipei")).toBe("2026-04-24");
    expect(formatYmd(d, "UTC")).toBe("2026-04-24");
  });

  it("UTC 2026-04-24T23:00 在 Asia/Taipei 為隔日 07:00 → 2026-04-25", () => {
    const d = new Date("2026-04-24T23:00:00Z");
    expect(formatYmd(d, "Asia/Taipei")).toBe("2026-04-25");
    expect(formatYmd(d, "UTC")).toBe("2026-04-24");
  });
});

describe("date-utils.parseYmd / fromYmdUtc", () => {
  it("合法 YMD 回傳 UTC 00:00", () => {
    const d = parseYmd("2026-04-24");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(3);
    expect(d!.getUTCDate()).toBe(24);
  });
  it("不合法 → null", () => {
    expect(parseYmd("")).toBeNull();
    expect(parseYmd(null)).toBeNull();
    expect(parseYmd("2026-13-01")).toBeNull();
    expect(parseYmd("2026-02-30")).toBeNull();
    expect(parseYmd("2026/04/24")).toBeNull();
  });
  it("fromYmdUtc 一致", () => {
    const d = fromYmdUtc("2026-04-24");
    expect(d.toISOString()).toBe("2026-04-24T00:00:00.000Z");
  });
});

describe("date-utils.getZonedComponents", () => {
  it("tz=UTC", () => {
    const c = getZonedComponents(new Date("2026-04-24T10:00:00Z"), "UTC");
    expect(c).toEqual({ year: 2026, month: 4, day: 24 });
  });
  it("tz=Asia/Taipei 跨日", () => {
    const c = getZonedComponents(
      new Date("2026-04-24T17:00:00Z"),
      "Asia/Taipei",
    );
    // 17:00Z → Taipei 01:00（隔日）
    expect(c).toEqual({ year: 2026, month: 4, day: 25 });
  });
});

describe("date-utils.getMonthGridRange (週一為起)", () => {
  it("2026 年 4 月：4/1 為週三，週起回推至 2026-03-30", () => {
    const anchor = fromYmdUtc("2026-04-15");
    const r = getMonthGridRange(anchor, "UTC", 1);
    expect(r.sinceYmd).toBe("2026-03-30");
    // since + 41 天
    expect(r.untilYmd).toBe("2026-05-10");
  });

  it("2026 年 2 月：2/1 為週日，週起回推至 2026-01-26", () => {
    const anchor = fromYmdUtc("2026-02-10");
    const r = getMonthGridRange(anchor, "UTC", 1);
    expect(r.sinceYmd).toBe("2026-01-26");
    expect(r.untilYmd).toBe("2026-03-08");
  });

  it("週日為起：2026-04 → since=2026-03-29", () => {
    const anchor = fromYmdUtc("2026-04-15");
    const r = getMonthGridRange(anchor, "UTC", 0);
    expect(r.sinceYmd).toBe("2026-03-29");
    expect(r.untilYmd).toBe("2026-05-09");
  });
});

describe("date-utils.buildMonthGridDays", () => {
  it("產出 42 格，且本月日標示正確", () => {
    const anchor = fromYmdUtc("2026-04-15");
    const cells = buildMonthGridDays(anchor, "UTC", 1);
    expect(cells).toHaveLength(42);
    expect(cells[0].ymd).toBe("2026-03-30");
    expect(cells[41].ymd).toBe("2026-05-10");
    // 本月日（4 月）應該不是 outside
    const apr24 = cells.find((c) => c.ymd === "2026-04-24")!;
    expect(apr24.isOutsideMonth).toBe(false);
    // 3 月 30 日應該是 outside
    const mar30 = cells.find((c) => c.ymd === "2026-03-30")!;
    expect(mar30.isOutsideMonth).toBe(true);
  });
});

describe("date-utils.getWeekRange", () => {
  it("2026-04-24（週五）→ since=2026-04-20（週一）、until=2026-04-26（週日）", () => {
    const anchor = fromYmdUtc("2026-04-24");
    const r = getWeekRange(anchor, "UTC", 1);
    expect(r.sinceYmd).toBe("2026-04-20");
    expect(r.untilYmd).toBe("2026-04-26");
  });

  it("週日為起：2026-04-24 → since=2026-04-19", () => {
    const anchor = fromYmdUtc("2026-04-24");
    const r = getWeekRange(anchor, "UTC", 0);
    expect(r.sinceYmd).toBe("2026-04-19");
    expect(r.untilYmd).toBe("2026-04-25");
  });
});

describe("date-utils.addMonths / addWeeks / addDays", () => {
  it("addMonths 跨月日", () => {
    const d = fromYmdUtc("2026-01-31");
    // +1 個月在 2 月沒有 31 日 → 取 2 月最後一天 2026-02-28
    const r = addMonths(d, 1, "UTC");
    expect(formatYmd(r, "UTC")).toBe("2026-02-28");
  });
  it("addMonths 正常", () => {
    const d = fromYmdUtc("2026-04-24");
    expect(formatYmd(addMonths(d, 1, "UTC"), "UTC")).toBe("2026-05-24");
    expect(formatYmd(addMonths(d, -1, "UTC"), "UTC")).toBe("2026-03-24");
  });
  it("addWeeks / addDays", () => {
    const d = fromYmdUtc("2026-04-24");
    expect(formatYmd(addWeeks(d, 1, "UTC"), "UTC")).toBe("2026-05-01");
    expect(formatYmd(addDays(d, -3, "UTC"), "UTC")).toBe("2026-04-21");
  });
});

describe("date-utils.todayInTz", () => {
  it("以指定 now 計算今日", () => {
    const now = new Date("2026-04-24T17:00:00Z");
    expect(formatYmd(todayInTz("UTC", now), "UTC")).toBe("2026-04-24");
    expect(formatYmd(todayInTz("Asia/Taipei", now), "Asia/Taipei")).toBe(
      "2026-04-25",
    );
  });
});

describe("date-utils.formatters", () => {
  it("formatMonthTitle 輸出「YYYY 年 M 月」", () => {
    const d = fromYmdUtc("2026-04-15");
    expect(formatMonthTitle(d, "UTC")).toBe("2026 年 4 月");
  });
  it("formatDayTitle 含星期", () => {
    const d = fromYmdUtc("2026-04-24");
    const s = formatDayTitle(d, "UTC");
    expect(s).toMatch(/2026/);
    expect(s).toMatch(/4/);
    expect(s).toMatch(/24/);
  });
  it("formatWeekTitle 含起訖", () => {
    const d = fromYmdUtc("2026-04-24");
    const s = formatWeekTitle(d, "UTC");
    expect(s).toMatch(/–/);
  });
});
