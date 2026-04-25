/**
 * F-029b — Journal 編輯頁 /journal/:date
 *
 * 對應 issue：#106（Wave 0 skeleton；Wave 4 補完整 assertion）
 * 對應 spec：specs/features/f029-journal-frontend.md
 *
 * Wave 0：所有 test 皆 test.skip(true, ...)。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  JOURNAL_TESTIDS as J,
  installJournalMock,
  makeMockJournal,
} from "../fixtures/journal";
import {
  CALENDAR_TESTIDS as C,
  installCalendarMock,
  makeMockDay,
  emptyMonthGrid,
} from "../fixtures/calendar";

const TARGET = "2026-04-24";

test.describe("Journal — 編輯頁（F-029b）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa09-journal-editor-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: /journal/:date 不存在 → 顯示空白編輯器", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 F-029b 完成再啟用");
    // GIVEN GET /journal/:date 回 404
    await installJournalMock(page, { journals: {} });

    // WHEN 進入編輯頁
    await page.goto(`/journal/${TARGET}`);

    // THEN 顯示空白編輯器
    await expect(page.getByTestId(J.editorPage)).toBeVisible();
    await expect(page.getByTestId(J.editorEmptyState)).toBeVisible();
    await expect(page.getByTestId(J.editorContent)).toHaveValue("");
  });

  test("Scenario: 寫內容 + 選 mood + 儲存 → toast「已儲存」", async ({ page }) => {
    test.skip(true, "Wave 4 — 等儲存流程完成再啟用");
    // GIVEN 空白編輯器
    await installJournalMock(page, { journals: {} });

    // WHEN 填內容、選 mood、按儲存
    await page.goto(`/journal/${TARGET}`);
    await page.getByTestId(J.editorContent).fill("今天天氣很好");
    await page.getByTestId(J.moodPicker).click();
    await page.getByTestId(J.moodOption("great")).click();
    await page.getByTestId(J.editorSaveButton).click();

    // THEN 顯示「已儲存」toast
    await expect(page.getByTestId(J.toastSaved)).toBeVisible();
  });

  test("Scenario: 載入既有 journal → 編輯器填入既有內容", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 GET /journal/:date 串接完成再啟用");
    // GIVEN 已有 journal
    const journals = {
      [TARGET]: makeMockJournal(TARGET, { content: "原本內容", mood: "ok" }),
    };
    await installJournalMock(page, { journals });

    // WHEN 進入編輯頁
    await page.goto(`/journal/${TARGET}`);

    // THEN 編輯器顯示既有內容
    await expect(page.getByTestId(J.editorContent)).toHaveValue(/原本內容/);
  });

  test("Scenario: 從 /calendar Day Sheet「寫日記」→ 跳 /journal/:date", async ({ page }) => {
    test.skip(true, "Wave 4 — 需等 F-028/F-029 + Day Sheet 串接完成");
    // GIVEN 行事曆 Day Sheet 已開啟（無 journal）
    const day = makeMockDay(TARGET, { entries: [], events: [], journal: null });
    const days = emptyMonthGrid(TARGET).map((d) => (d.date === TARGET ? day : d));
    await installCalendarMock(page, { days, dayDetails: { [TARGET]: day } });
    await installJournalMock(page, { journals: {} });

    // WHEN 點 Sheet 中「寫日記」
    await page.goto(`/calendar?view=month&date=${TARGET}&sheet=${TARGET}`);
    await page.getByTestId(C.sheetWriteJournalButton).click();

    // THEN URL 跳到 /journal/:date
    await expect(page).toHaveURL(new RegExp(`/journal/${TARGET}$`));
    await expect(page.getByTestId(J.editorPage)).toBeVisible();
  });

  test("Scenario: 編輯後不儲存嘗試離開 → beforeunload 警告", async ({ page }) => {
    test.skip(true, "Wave 4 — 需等 dirty-state hook 完成");
    // GIVEN 編輯器內容已修改
    await installJournalMock(page, { journals: {} });
    await page.goto(`/journal/${TARGET}`);
    await page.getByTestId(J.editorContent).fill("半成品");

    // WHEN 嘗試離開
    // THEN beforeunload 觸發（檢查 window.onbeforeunload 已綁定）
    const hasHandler = await page.evaluate(() => {
      return typeof window.onbeforeunload === "function" || true; // placeholder
    });
    expect(hasHandler).toBeTruthy();
  });

  test("Scenario: 儲存衝突 (409 JOURNAL_EXISTS) → 顯示確認 dialog", async ({ page }) => {
    test.skip(true, "Wave 4 — 需等 conflict dialog 完成");
    // GIVEN POST 回 409
    await installJournalMock(page, { journals: {}, createConflict: true });

    // WHEN 儲存
    await page.goto(`/journal/${TARGET}`);
    await page.getByTestId(J.editorContent).fill("test");
    await page.getByTestId(J.editorSaveButton).click();

    // THEN 顯示衝突 dialog
    await expect(page.getByTestId(J.dialogConflict)).toBeVisible();
    await expect(page.getByTestId(J.dialogConflictReload)).toBeVisible();
  });
});
