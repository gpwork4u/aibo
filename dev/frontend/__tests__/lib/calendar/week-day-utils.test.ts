import { describe, expect, it } from "vitest";
import {
  buildWeekDays,
  clipEventToDay,
  clipToAxisPx,
  eventsIntersectingDay,
  formatMinutes,
  minutesToAxisTopPx,
  parseYmd,
  timeAxisHours,
  zonedYmdAndMinutes,
} from "@/lib/calendar/date-utils";

const TZ = "Asia/Taipei";

describe("timeAxisHours", () => {
  it("回傳 06-23 共 18 格", () => {
    const h = timeAxisHours();
    expect(h.length).toBe(18);
    expect(h[0]).toBe(6);
    expect(h[h.length - 1]).toBe(23);
  });
});

describe("buildWeekDays", () => {
  it("週一起始，回傳 7 天", () => {
    const anchor = parseYmd("2026-04-24")!; // 週五
    const days = buildWeekDays(anchor, TZ, 1);
    expect(days.length).toBe(7);
    expect(days[0].ymd).toBe("2026-04-20"); // 週一
    expect(days[6].ymd).toBe("2026-04-26"); // 週日
  });

  it("週日起始，回傳 7 天", () => {
    const anchor = parseYmd("2026-04-24")!;
    const days = buildWeekDays(anchor, TZ, 0);
    expect(days[0].ymd).toBe("2026-04-19"); // 週日
    expect(days[6].ymd).toBe("2026-04-25"); // 週六
  });
});

describe("zonedYmdAndMinutes", () => {
  it("Asia/Taipei 下 09:00 → 540 分", () => {
    const r = zonedYmdAndMinutes("2026-04-24T09:00:00+08:00", TZ);
    expect(r?.ymd).toBe("2026-04-24");
    expect(r?.minutes).toBe(9 * 60);
  });

  it("午夜 00:00", () => {
    const r = zonedYmdAndMinutes("2026-04-24T00:00:00+08:00", TZ);
    expect(r?.ymd).toBe("2026-04-24");
    expect(r?.minutes).toBe(0);
  });

  it("無效字串回 null", () => {
    expect(zonedYmdAndMinutes("not-a-date", TZ)).toBeNull();
  });
});

describe("clipEventToDay - 同日事件", () => {
  it("09:00-10:30 在同一天 → 540..630", () => {
    const ev = {
      start: "2026-04-24T09:00:00+08:00",
      end: "2026-04-24T10:30:00+08:00",
      all_day: false,
    };
    const clip = clipEventToDay(ev, "2026-04-24", TZ);
    expect(clip).not.toBeNull();
    expect(clip!.startMin).toBe(540);
    expect(clip!.endMin).toBe(630);
    expect(clip!.continuesFromPrev).toBe(false);
    expect(clip!.continuesToNext).toBe(false);
  });

  it("不在當天 → null", () => {
    const ev = {
      start: "2026-04-24T09:00:00+08:00",
      end: "2026-04-24T10:00:00+08:00",
      all_day: false,
    };
    expect(clipEventToDay(ev, "2026-04-25", TZ)).toBeNull();
  });
});

describe("clipEventToDay - 跨日事件", () => {
  it("04-24 23:00 → 04-25 01:00：前一天回 23:00-24:00（續至次日）", () => {
    const ev = {
      start: "2026-04-24T23:00:00+08:00",
      end: "2026-04-25T01:00:00+08:00",
      all_day: false,
    };
    const d1 = clipEventToDay(ev, "2026-04-24", TZ);
    expect(d1).not.toBeNull();
    expect(d1!.startMin).toBe(23 * 60);
    expect(d1!.endMin).toBe(24 * 60);
    expect(d1!.continuesFromPrev).toBe(false);
    expect(d1!.continuesToNext).toBe(true);
  });

  it("04-24 23:00 → 04-25 01:00：次日回 00:00-01:00（前日續）", () => {
    const ev = {
      start: "2026-04-24T23:00:00+08:00",
      end: "2026-04-25T01:00:00+08:00",
      all_day: false,
    };
    const d2 = clipEventToDay(ev, "2026-04-25", TZ);
    expect(d2).not.toBeNull();
    expect(d2!.startMin).toBe(0);
    expect(d2!.endMin).toBe(60);
    expect(d2!.continuesFromPrev).toBe(true);
    expect(d2!.continuesToNext).toBe(false);
  });

  it("事件 end 正好為次日 00:00 → 當日結束 24:00，次日不相交", () => {
    const ev = {
      start: "2026-04-24T22:00:00+08:00",
      end: "2026-04-25T00:00:00+08:00",
      all_day: false,
    };
    const d1 = clipEventToDay(ev, "2026-04-24", TZ);
    expect(d1!.startMin).toBe(22 * 60);
    expect(d1!.endMin).toBe(24 * 60);
    expect(clipEventToDay(ev, "2026-04-25", TZ)).toBeNull();
  });
});

describe("clipEventToDay - all_day", () => {
  it("all_day 單日：0..1440", () => {
    const ev = {
      start: "2026-04-24T00:00:00+08:00",
      end: "2026-04-25T00:00:00+08:00", // gcal all-day end 為排他
      all_day: true,
    };
    const clip = clipEventToDay(ev, "2026-04-24", TZ);
    expect(clip).not.toBeNull();
    expect(clip!.startMin).toBe(0);
    expect(clip!.endMin).toBe(1440);
    expect(clip!.continuesFromPrev).toBe(false);
    expect(clip!.continuesToNext).toBe(false);
  });

  it("all_day 跨 3 天：04-24 ~ 04-26", () => {
    const ev = {
      start: "2026-04-24T00:00:00+08:00",
      end: "2026-04-27T00:00:00+08:00", // 4/24, 25, 26 三天
      all_day: true,
    };
    const d24 = clipEventToDay(ev, "2026-04-24", TZ);
    const d25 = clipEventToDay(ev, "2026-04-25", TZ);
    const d26 = clipEventToDay(ev, "2026-04-26", TZ);
    const d27 = clipEventToDay(ev, "2026-04-27", TZ);
    expect(d24).not.toBeNull();
    expect(d24!.continuesFromPrev).toBe(false);
    expect(d24!.continuesToNext).toBe(true);
    expect(d25!.continuesFromPrev).toBe(true);
    expect(d25!.continuesToNext).toBe(true);
    expect(d26!.continuesFromPrev).toBe(true);
    expect(d26!.continuesToNext).toBe(false);
    expect(d27).toBeNull();
  });
});

describe("eventsIntersectingDay", () => {
  it("過濾並依 startMin 排序", () => {
    const events = [
      {
        gcal_id: "b",
        summary: "B",
        start: "2026-04-24T14:00:00+08:00",
        end: "2026-04-24T15:00:00+08:00",
        all_day: false,
        linked_entry_id: null,
      },
      {
        gcal_id: "a",
        summary: "A",
        start: "2026-04-24T09:00:00+08:00",
        end: "2026-04-24T10:00:00+08:00",
        all_day: false,
        linked_entry_id: null,
      },
      {
        gcal_id: "other",
        summary: "Other",
        start: "2026-04-25T09:00:00+08:00",
        end: "2026-04-25T10:00:00+08:00",
        all_day: false,
        linked_entry_id: null,
      },
    ];
    const out = eventsIntersectingDay(events, "2026-04-24", TZ);
    expect(out.map((o) => o.event.gcal_id)).toEqual(["a", "b"]);
  });
});

describe("minutesToAxisTopPx / clipToAxisPx", () => {
  it("06:00 → 0px, 07:00 → 48px", () => {
    expect(minutesToAxisTopPx(6 * 60)).toBe(0);
    expect(minutesToAxisTopPx(7 * 60)).toBe(48);
  });

  it("clip 05:00-07:00 → 被 top clip", () => {
    const r = clipToAxisPx(5 * 60, 7 * 60);
    expect(r.clippedFromTop).toBe(true);
    expect(r.topPx).toBe(0);
    expect(r.heightPx).toBe(48); // 06:00-07:00
  });

  it("clip 23:30-24:30 → 被 bottom clip", () => {
    const r = clipToAxisPx(23 * 60 + 30, 24 * 60 + 30);
    expect(r.clippedFromBottom).toBe(true);
  });

  it("最小高度 20px（極短事件）", () => {
    const r = clipToAxisPx(9 * 60, 9 * 60 + 5);
    expect(r.heightPx).toBeGreaterThanOrEqual(20);
  });
});

describe("formatMinutes", () => {
  it("0 → 00:00, 540 → 09:00, 1439 → 23:59", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(540)).toBe("09:00");
    expect(formatMinutes(1439)).toBe("23:59");
  });
});
