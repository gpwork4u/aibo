/**
 * F-029 — Journal Heatmap（年度 / 月度 日記覆蓋熱力圖）
 *
 * 對應 issue：#106（Wave 0 skeleton；Wave 4 補完整 assertion）
 * 對應 spec：specs/features/f029-journal-frontend.md（時間軸 + 視覺化）
 *
 * Wave 0：所有 test 皆 test.skip(true, ...)。
 *
 * NOTE: heatmap 的具體位置（在 /journal 列表頁 sidebar 還是獨立區塊）
 * 由 engineer 在 F-029 實作時決定，這裡先以 testid 對齊。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  JOURNAL_TESTIDS as J,
  installJournalMock,
  makeMockJournal,
} from "../fixtures/journal";

test.describe("Journal — Heatmap 視覺化（F-029）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa09-journal-heatmap-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: /journal 進入後 Heatmap 渲染", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 Heatmap 元件完成再啟用");
    // GIVEN 使用者有零散日記
    const journals = {
      "2026-04-24": makeMockJournal("2026-04-24", { mood: "great" }),
      "2026-04-20": makeMockJournal("2026-04-20", { mood: "ok" }),
      "2026-03-15": makeMockJournal("2026-03-15", { mood: "down" }),
    };
    await installJournalMock(page, { journals });

    // WHEN 進入 /journal
    await page.goto("/journal");

    // THEN Heatmap 顯示
    await expect(page.getByTestId(J.heatmap)).toBeVisible();
    await expect(page.getByTestId(J.heatmapLegend)).toBeVisible();
  });

  test("Scenario: 有日記的格子有強調樣式", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 Heatmap 顏色梯度完成");
    // GIVEN 2026-04-24 有 journal
    const journals = {
      "2026-04-24": makeMockJournal("2026-04-24", { mood: "great" }),
    };
    await installJournalMock(page, { journals });

    // WHEN 進入 /journal
    await page.goto("/journal");

    // THEN 對應格子可見 + data-state="filled"
    const cell = page.getByTestId(J.heatmapCell("2026-04-24"));
    await expect(cell).toBeVisible();
    await expect(cell).toHaveAttribute("data-state", /filled|has-journal/);
  });

  test("Scenario: 點 Heatmap 格子 → 跳對應日期編輯頁", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 Heatmap click → router.push 完成");
    // GIVEN 有 journal 的格子
    const journals = {
      "2026-04-24": makeMockJournal("2026-04-24", {}),
    };
    await installJournalMock(page, { journals });

    // WHEN 點格子
    await page.goto("/journal");
    await page.getByTestId(J.heatmapCell("2026-04-24")).click();

    // THEN URL 跳到對應編輯頁
    await expect(page).toHaveURL(/\/journal\/2026-04-24$/);
  });
});
