/**
 * F-027c — DayDetailSheet 開啟 / 三區渲染 / URL 同步
 *
 * 對應 issue：#85（Wave 3 完整 assertion）
 *
 * 重要：實作採用 `sheet` URL 參數（非 `date`）控制 Sheet 開關。
 * 參見 dev/frontend/app/(dashboard)/calendar/page.tsx §sheetParam。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  CALENDAR_TESTIDS as T,
  DEFAULT_TEST_TIMEZONE,
  installCalendarMock,
  makeMockDay,
  emptyMonthGrid,
} from "../fixtures/calendar";

test.use({ timezoneId: DEFAULT_TEST_TIMEZONE });

const TARGET = "2026-04-24";

function mockDaySetup() {
  const day = makeMockDay(TARGET, {
    entries: [{ id: "entry-1", title: "E2E entry" }],
    events: [
      {
        gcal_id: "ev-1",
        summary: "Standup",
        start: `${TARGET}T09:00:00+08:00`,
        end: `${TARGET}T09:30:00+08:00`,
      },
    ],
    journal: { id: "j-1" },
    has_journal: true,
  });
  const days = emptyMonthGrid(TARGET).map((d) => (d.date === TARGET ? day : d));
  return { days, dayDetails: { [TARGET]: day } };
}

test.describe("Calendar — Day Detail Sheet（F-027c）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa08-sheet-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 點月格 → Sheet 滑出 + URL sheet 參數同步", async ({ page }) => {
    const { days, dayDetails } = mockDaySetup();
    await installCalendarMock(page, { days, dayDetails });

    await page.goto(`/calendar?view=month&date=${TARGET}`);
    await expect(page.getByTestId(T.monthView)).toBeVisible();

    await page.getByTestId(T.dayCell(TARGET)).click();

    await expect(page.getByTestId(T.sheet)).toBeVisible();
    // URL 含 sheet=YYYY-MM-DD
    await expect(page).toHaveURL(new RegExp(`sheet=${TARGET}`));
  });

  test("Scenario: Sheet 三區（條目 / 事件 / 日記）全部渲染", async ({ page }) => {
    const { days, dayDetails } = mockDaySetup();
    await installCalendarMock(page, { days, dayDetails });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);

    const sheet = page.getByTestId(T.sheet);
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionEntries)).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionEvents)).toBeVisible();
    await expect(sheet.getByTestId(T.sheetSectionJournal)).toBeVisible();
  });

  test("Scenario: URL 直接帶 sheet 可直接開 Sheet", async ({ page }) => {
    const { days, dayDetails } = mockDaySetup();
    await installCalendarMock(page, { days, dayDetails });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    await expect(page.getByTestId(T.sheet)).toBeVisible();
  });

  test("Scenario: 按 Esc 關閉 Sheet + 清除 URL sheet 參數", async ({ page }) => {
    const { days, dayDetails } = mockDaySetup();
    await installCalendarMock(page, { days, dayDetails });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    await expect(page.getByTestId(T.sheet)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByTestId(T.sheet)).toBeHidden();
    await expect(page).not.toHaveURL(/sheet=/);
  });

  test("Scenario: 點關閉按鈕關閉 Sheet", async ({ page }) => {
    const { days, dayDetails } = mockDaySetup();
    await installCalendarMock(page, { days, dayDetails });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    await expect(page.getByTestId(T.sheet)).toBeVisible();

    // Radix Sheet 的預設關閉按鈕（aria-label "Close"）
    // 若 engineer 有另加 testid 則直接用；此處採無障礙 name fallback
    const closeByLabel = page.getByRole("button", { name: /^close$/i });
    const closeByTestid = page.getByTestId(T.sheetClose);
    if ((await closeByTestid.count()) > 0) {
      await closeByTestid.first().click();
    } else {
      await closeByLabel.first().click();
    }

    await expect(page.getByTestId(T.sheet)).toBeHidden();
  });

  test("Scenario: 「寫日記」CTA 目前為 disabled（F-028 尚未上線）", async ({ page }) => {
    const { days, dayDetails } = mockDaySetup();
    // 清掉 journal 以顯示「尚未建立日記」區塊
    const emptyJournal = {
      ...dayDetails[TARGET],
      journal: null,
      has_journal: false,
    };
    await installCalendarMock(page, {
      days,
      dayDetails: { [TARGET]: emptyJournal },
    });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    const btn = page.getByTestId(T.sheetWriteJournalButton);
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });
});
