/**
 * F-029a — Journal 列表頁 /journal
 *
 * 對應 issue：#106（Wave 0 skeleton；Wave 4 補完整 assertion）
 * 對應 spec：specs/features/f029-journal-frontend.md
 *
 * Wave 0：所有 test 皆 test.skip(true, ...)，僅作為 scenario 骨架。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  JOURNAL_TESTIDS as J,
  installJournalMock,
  makeMockJournal,
} from "../fixtures/journal";

const TODAY = "2026-04-24";

test.describe("Journal — 列表頁（F-029a）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa09-journal-list-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 進入 /journal → 顯示時間軸列表", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 F-029a 完成再啟用");
    // GIVEN 使用者已有 3 篇 journal
    const journals = {
      "2026-04-24": makeMockJournal("2026-04-24", { mood: "great", content: "Day A" }),
      "2026-04-23": makeMockJournal("2026-04-23", { mood: "ok", content: "Day B" }),
      "2026-04-22": makeMockJournal("2026-04-22", { mood: "down", content: "Day C" }),
    };
    await installJournalMock(page, { journals });

    // WHEN 使用者進入 /journal
    await page.goto("/journal");

    // THEN 顯示三筆 list item，最新在上
    await expect(page.getByTestId(J.listPage)).toBeVisible();
    const items = page.getByTestId(J.listItem);
    await expect(items).toHaveCount(3);
    await expect(items.first()).toContainText("2026-04-24");
  });

  test("Scenario: 篩選 mood → 列表更新", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 mood filter UI 完成再啟用");
    // GIVEN 三筆 journal 不同 mood
    // WHEN 點 mood filter 選 great
    // THEN 只顯示 mood=great 的 item
    await installJournalMock(page);
    await page.goto("/journal");
    await page.getByTestId(J.listMoodFilter).click();
    await page.getByTestId(J.listMoodOption("great")).click();
    await expect(page.getByTestId(J.listItem)).toHaveCount(1);
  });

  test("Scenario: 列表為空 → 顯示空狀態 + 「寫第一篇」CTA", async ({ page }) => {
    test.skip(true, "Wave 4 — 等空狀態 UI 完成再啟用");
    // GIVEN 使用者沒有任何 journal
    await installJournalMock(page, { journals: {}, list: [] });

    // WHEN 進入 /journal
    await page.goto("/journal");

    // THEN 顯示空狀態
    await expect(page.getByTestId(J.listEmpty)).toBeVisible();
    await expect(page.getByTestId(J.listEmptyWriteFirst)).toBeVisible();
  });

  test("Scenario: 點「寫第一篇」→ 跳 /journal/:today", async ({ page }) => {
    test.skip(true, "Wave 4 — 等空狀態 CTA 連結完成再啟用");
    // GIVEN 空狀態
    // WHEN 點「寫第一篇」
    // THEN URL = /journal/今天日期
    await installJournalMock(page, { journals: {}, list: [] });
    await page.goto("/journal");
    await page.getByTestId(J.listEmptyWriteFirst).click();
    await expect(page).toHaveURL(new RegExp(`/journal/${TODAY}$`));
  });

  test("Scenario: list item 顯示 mood emoji + draft badge + 前 200 字", async ({ page }) => {
    test.skip(true, "Wave 4 — 等列表卡片設計完成再啟用");
    // GIVEN 一筆 draft journal
    const journals = {
      [TODAY]: makeMockJournal(TODAY, {
        is_draft: true,
        mood: "ok",
        content: "Hello world. ".repeat(40),
      }),
    };
    await installJournalMock(page, { journals });

    // WHEN 進入 /journal
    await page.goto("/journal");

    // THEN 顯示 draft badge + mood emoji + preview
    const item = page.getByTestId(J.listItemByDate(TODAY));
    await expect(item.getByTestId(J.listItemDraftBadge)).toBeVisible();
    await expect(item.getByTestId(J.listItemMoodEmoji)).toBeVisible();
    await expect(item.getByTestId(J.listItemPreview)).toBeVisible();
  });
});
