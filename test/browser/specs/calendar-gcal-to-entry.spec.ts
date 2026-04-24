/**
 * F-026c / F-027c — Gcal event 轉 entry（成功 / 409 / 502 / linked_entry_id 顯示）
 *
 * 對應 issue：#85（Wave 3 完整 assertion）
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

function daySetupWithEvents(events: Array<{
  gcal_id: string;
  summary: string;
  linked_entry_id?: string | null;
}>) {
  const fullEvents = events.map((e) => ({
    gcal_id: e.gcal_id,
    summary: e.summary,
    start: `${TARGET}T09:00:00+08:00`,
    end: `${TARGET}T10:00:00+08:00`,
    linked_entry_id: e.linked_entry_id ?? null,
  }));
  const day = makeMockDay(TARGET, {
    entries: [{ id: "pre-entry", title: "pre-existing" }],
    events: fullEvents,
  });
  const days = emptyMonthGrid(TARGET).map((d) => (d.date === TARGET ? day : d));
  return { days, dayDetails: { [TARGET]: day } };
}

test.describe("Calendar — Gcal event → Entry（F-026c + F-027c）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa08-convert-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 成功轉換（201）→ toast 「已轉為知識條目」", async ({ page }) => {
    const { days, dayDetails } = daySetupWithEvents([
      { gcal_id: "ev-convert-1", summary: "Standup" },
    ]);

    await installCalendarMock(page, {
      days,
      dayDetails,
      convert: {
        status: 201,
        body: { id: "new-entry-id", source_ref: "ev-convert-1" },
      },
    });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    const sheet = page.getByTestId(T.sheet);
    await expect(sheet).toBeVisible();

    const eventCard = sheet.getByTestId(T.eventCard).first();
    await eventCard.getByTestId(T.eventToEntryButton).click();

    // sonner toast 訊息可見
    await expect(page.getByText(/已轉為知識條目/)).toBeVisible({ timeout: 5000 });
  });

  test("Scenario: 重複轉（409 ALREADY_LINKED）顯示「已轉過」info toast", async ({ page }) => {
    const { days, dayDetails } = daySetupWithEvents([
      { gcal_id: "ev-dup", summary: "Already linked" },
    ]);

    await installCalendarMock(page, {
      days,
      dayDetails,
      convert: {
        status: 409,
        body: { code: "ALREADY_LINKED", existing_entry_id: "existing-123" },
      },
    });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    const sheet = page.getByTestId(T.sheet);
    await expect(sheet).toBeVisible();

    await sheet
      .getByTestId(T.eventCard)
      .first()
      .getByTestId(T.eventToEntryButton)
      .click();

    // message: "此事件已轉過，重新整理中…"
    await expect(page.getByText(/已轉過/)).toBeVisible({ timeout: 5000 });
  });

  test("Scenario: Gcal 上游失敗（502 GCAL_UPSTREAM_ERROR）顯示錯誤 toast", async ({
    page,
  }) => {
    const { days, dayDetails } = daySetupWithEvents([
      { gcal_id: "ev-502", summary: "Upstream fail" },
    ]);

    await installCalendarMock(page, {
      days,
      dayDetails,
      convert: {
        status: 502,
        body: { code: "GCAL_UPSTREAM_ERROR" },
      },
    });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    const sheet = page.getByTestId(T.sheet);
    await expect(sheet).toBeVisible();

    await sheet
      .getByTestId(T.eventCard)
      .first()
      .getByTestId(T.eventToEntryButton)
      .click();

    // message: "Google Calendar 暫時無法存取，請稍後再試"
    await expect(page.getByText(/暫時無法存取|稍後再試|Google Calendar/)).toBeVisible({
      timeout: 5000,
    });
  });

  test("Scenario: 預先 linked event 直接顯示「檢視」連結，無「轉成條目」按鈕", async ({
    page,
  }) => {
    const { days, dayDetails } = daySetupWithEvents([
      {
        gcal_id: "ev-linked",
        summary: "Already linked event",
        linked_entry_id: "linked-entry-1",
      },
    ]);

    await installCalendarMock(page, { days, dayDetails });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    const sheet = page.getByTestId(T.sheet);
    await expect(sheet).toBeVisible();

    const card = sheet.getByTestId(T.eventCard).first();
    await expect(card.getByTestId(T.eventLinkedEntryLink)).toBeVisible();
    await expect(card.getByTestId(T.eventToEntryButton)).toHaveCount(0);
  });

  test("Scenario: 點「檢視」連結跳到 entry 詳情頁", async ({ page }) => {
    const { days, dayDetails } = daySetupWithEvents([
      {
        gcal_id: "ev-linked-nav",
        summary: "Linked for nav",
        linked_entry_id: "nav-entry-1",
      },
    ]);
    await installCalendarMock(page, { days, dayDetails });

    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    const sheet = page.getByTestId(T.sheet);
    const link = sheet.getByTestId(T.eventLinkedEntryLink).first();
    await expect(link).toHaveAttribute("href", /\/entries\/nav-entry-1/);
  });
});
