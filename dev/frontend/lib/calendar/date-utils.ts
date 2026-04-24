/**
 * Calendar 日期工具（純函式、無 React 相依）
 *
 * 時區策略：所有 date 以「該時區下的該日」為準
 *   - `formatYmd(date, tz)`：輸出該 tz 下的 YYYY-MM-DD
 *   - `getMonthGridRange(date, tz)`：以該 tz 下的 date 為錨點，計算月視圖 6×7 覆蓋區間
 *   - `getWeekRange(date, tz, weekStartsOn=1)`：計算該 tz 下的那一週範圍
 *
 * 注意：這裡的 `Date` 物件代表「時間瞬間」。真正的「該時區下的日曆日」
 * 經由 Intl.DateTimeFormat 提取年月日，再以 UTC 建構新 Date 進行運算，
 * 避免 host 時區偏移帶來的錯誤。
 */

export type DateComponents = { year: number; month: number; day: number };

/** 以 tz 解釋 date，回傳該 tz 下的年月日（month 為 1-12）。 */
export function getZonedComponents(date: Date, tz: string): DateComponents {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA 格式：YYYY-MM-DD
  const [y, m, d] = fmt.format(date).split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** 以 tz 輸出 YYYY-MM-DD（避免 host 時區漂移）。 */
export function formatYmd(date: Date, tz: string): string {
  const { year, month, day } = getZonedComponents(date, tz);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** 以 YYYY-MM-DD 建立「該日 UTC 00:00」的 Date。 */
export function fromYmdUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * 回傳該錨點日期所屬月份的月視圖覆蓋區間（以 week start 為起、完整 6 週）。
 *
 * - `since`: 覆蓋當月第一天所在那週的週起日（以 `weekStartsOn` 為準）
 * - `until`: 自 since 起往後 41 天（共 42 日 = 6 週 × 7 天）
 * - 回傳的 Date 以 UTC 00:00 為時刻，其 YMD 值即代表該日（不隨 host tz 漂移）。
 */
export function getMonthGridRange(
  date: Date,
  tz: string,
  weekStartsOn: 0 | 1 = 1,
): { since: Date; until: Date; sinceYmd: string; untilYmd: string } {
  const { year, month } = getZonedComponents(date, tz);
  // 當月第一天（UTC 00:00 代表該日）
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // firstOfMonth 對應的星期（0=週日、1=週一、...、6=週六），用 UTC 取得以避免 host tz 漂移
  const firstDow = firstOfMonth.getUTCDay();
  // 距離 week start 的天數
  const offset = (firstDow - weekStartsOn + 7) % 7;
  const since = new Date(firstOfMonth);
  since.setUTCDate(since.getUTCDate() - offset);
  const until = new Date(since);
  until.setUTCDate(until.getUTCDate() + 41);
  return {
    since,
    until,
    sinceYmd: ymdFromUtc(since),
    untilYmd: ymdFromUtc(until),
  };
}

/** 回傳該日期所屬那週的範圍（7 天）。 */
export function getWeekRange(
  date: Date,
  tz: string,
  weekStartsOn: 0 | 1 = 1,
): { since: Date; until: Date; sinceYmd: string; untilYmd: string } {
  const { year, month, day } = getZonedComponents(date, tz);
  const base = new Date(Date.UTC(year, month - 1, day));
  const dow = base.getUTCDay();
  const offset = (dow - weekStartsOn + 7) % 7;
  const since = new Date(base);
  since.setUTCDate(since.getUTCDate() - offset);
  const until = new Date(since);
  until.setUTCDate(until.getUTCDate() + 6);
  return {
    since,
    until,
    sinceYmd: ymdFromUtc(since),
    untilYmd: ymdFromUtc(until),
  };
}

/** 月視圖 42 格的日期清單（YMD 字串 + 是否為本月）。 */
export function buildMonthGridDays(
  anchor: Date,
  tz: string,
  weekStartsOn: 0 | 1 = 1,
): Array<{ ymd: string; date: Date; isOutsideMonth: boolean }> {
  const { year, month } = getZonedComponents(anchor, tz);
  const { since } = getMonthGridRange(anchor, tz, weekStartsOn);
  const days: Array<{ ymd: string; date: Date; isOutsideMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    days.push({
      ymd: ymdFromUtc(d),
      date: d,
      isOutsideMonth: !(d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month),
    });
  }
  return days;
}

/** 回傳某錨點日期前/後一個月的 Date（回傳的 Date 以 UTC 00:00 代表該日）。 */
export function addMonths(date: Date, months: number, tz: string): Date {
  const { year, month, day } = getZonedComponents(date, tz);
  // 以 UTC 計算避免漂移；若下個月沒有同一天則用當月最後一天
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

/** 回傳某錨點日期前/後 N 週的 Date。 */
export function addWeeks(date: Date, weeks: number, tz: string): Date {
  const { year, month, day } = getZonedComponents(date, tz);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + weeks * 7);
  return base;
}

/** 回傳某錨點日期前/後 N 天的 Date。 */
export function addDays(date: Date, days: number, tz: string): Date {
  const { year, month, day } = getZonedComponents(date, tz);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  return base;
}

/** 「今天」在該 tz 下的 Date（UTC 00:00 代表該日）。 */
export function todayInTz(tz: string, now: Date = new Date()): Date {
  const { year, month, day } = getZonedComponents(now, tz);
  return new Date(Date.UTC(year, month - 1, day));
}

/** 傳入 YYYY-MM-DD，若合法回傳 Date（UTC 00:00），否則 null。 */
export function parseYmd(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  // 驗證日是否合法（例如 2026-02-30 會漂到 3 月）
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** 以 `zh-TW` locale + 指定 tz 格式化標題，例如「2026 年 4 月」。 */
export function formatMonthTitle(date: Date, tz: string): string {
  const { year, month } = getZonedComponents(date, tz);
  return `${year} 年 ${month} 月`;
}

/** 格式化為「2026 年 4 月 24 日 星期五」。 */
export function formatDayTitle(date: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat("zh-TW", {
    timeZone: tz,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  return fmt.format(date);
}

/** 格式化週區間，例如「2026 年 4 月 20 日 – 4 月 26 日」。 */
export function formatWeekTitle(date: Date, tz: string): string {
  const { since, until } = getWeekRange(date, tz);
  const fmtFull = new Intl.DateTimeFormat("zh-TW", {
    timeZone: tz,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fmtShort = new Intl.DateTimeFormat("zh-TW", {
    timeZone: tz,
    month: "long",
    day: "numeric",
  });
  return `${fmtFull.format(since)} – ${fmtShort.format(until)}`;
}

/** 由 UTC Date（代表某一日）輸出 YYYY-MM-DD。 */
function ymdFromUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
