/**
 * F-032c — UpcomingTasksWidget（側邊欄底部的近期 task widget）
 *
 * 對應 issue：#127（Wave 0 skeleton；Wave 3 補完整 assertion）
 * 對應 spec：specs/features/f032-projects-frontend.md
 *
 * 重點：
 *   - widget 顯示未來 7 天 tasks（最多 5 筆）
 *   - 逾期 task 顯示紅色 badge
 *   - 空狀態
 *   - 點 widget item → 跳到對應 project + 開 task sheet
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import { installProjectsMock } from "../fixtures/projects";
import {
  TASK_TESTIDS as T,
  installTasksMock,
  makeMockTask,
} from "../fixtures/task";

test.describe("UpcomingTasksWidget（F-032c）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(
      request,
      `qa10-upcoming-${Date.now()}`,
    );
    await page.goto("/");
    await setupAuth(page, key);
    await installProjectsMock(page);
  });

  test("Scenario: widget 顯示未來 7 天的 tasks", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 UpcomingTasksWidget 完成再啟用");
    // GIVEN 跨專案 3 個未來 7 天內的未完成 task
    const upcoming = [
      makeMockTask({
        id: "u1",
        project_id: "p1",
        title: "明天交付",
        due_date: "2026-04-25",
      }),
      makeMockTask({
        id: "u2",
        project_id: "p1",
        title: "後天 review",
        due_date: "2026-04-26",
      }),
      makeMockTask({
        id: "u3",
        project_id: "p2",
        title: "週五 demo",
        due_date: "2026-04-28",
      }),
    ];
    await installTasksMock(page, { upcoming });

    // WHEN 進入任意頁（widget 在 sidebar 全站可見）
    await page.goto("/");

    // THEN widget 顯示 3 筆，依 due_date asc
    const widget = page.getByTestId(T.upcomingWidget);
    await expect(widget).toBeVisible();
    const items = widget.getByTestId(T.upcomingWidgetItem);
    await expect(items).toHaveCount(3);
    await expect(items.first()).toContainText("2026-04-25");
  });

  test("Scenario: 沒有近期 task → 顯示空狀態", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 widget 空狀態完成再啟用");
    // GIVEN upcoming = []
    await installTasksMock(page, { upcoming: [] });

    // WHEN 進入任意頁
    await page.goto("/");

    // THEN 顯示空狀態
    await expect(page.getByTestId(T.upcomingWidgetEmpty)).toBeVisible();
  });

  test("Scenario: 逾期 task → 顯示紅色 overdue badge", async ({ page }) => {
    test.skip(false, "Wave 3 — 等逾期紅標完成再啟用");
    // GIVEN 一筆逾期 task（due_date < today）
    // 注意：widget 可能由 /upcoming 或合併 /overdue 來源；以 spec 為準
    const upcoming = [
      makeMockTask({
        id: "overdue-1",
        project_id: "p1",
        title: "已逾期任務",
        due_date: "2026-04-20",
      }),
    ];
    const overdue = [
      makeMockTask({
        id: "overdue-1",
        project_id: "p1",
        title: "已逾期任務",
        due_date: "2026-04-20",
      }),
    ];
    await installTasksMock(page, { upcoming, overdue });

    // WHEN 進入任意頁
    await page.goto("/");

    // THEN 該 item 帶 overdue badge
    const item = page.getByTestId(T.upcomingWidgetItemById("overdue-1"));
    await expect(item).toBeVisible();
    await expect(
      item.getByTestId(T.upcomingWidgetItemOverdueBadge),
    ).toBeVisible();
  });

  test("Scenario: 點 widget item → 跳到 project + 開 task sheet", async ({
    page,
  }) => {
    test.skip(false, "Wave 3 — 等 widget item 連結完成再啟用");
    const upcoming = [
      makeMockTask({
        id: "u1",
        project_id: "p1",
        title: "明天交付",
        due_date: "2026-04-25",
      }),
    ];
    await installTasksMock(page, { upcoming });
    await page.goto("/");

    // WHEN 點 item
    await page.getByTestId(T.upcomingWidgetItemById("u1")).click();

    // THEN 導向 /projects/p1 並開啟 sheet
    await expect(page).toHaveURL(/\/projects\/p1/);
    await expect(page.getByTestId(T.sheet)).toBeVisible();
  });

  test("Scenario: widget 至多顯示 5 筆", async ({ page }) => {
    test.skip(false, "Wave 3 — 等 widget cap=5 完成再啟用");
    const upcoming = Array.from({ length: 7 }, (_, i) =>
      makeMockTask({
        id: `u${i}`,
        project_id: "p1",
        title: `task ${i}`,
        due_date: `2026-04-${25 + i}`,
      }),
    );
    await installTasksMock(page, { upcoming });
    await page.goto("/");

    // THEN widget 至多顯示 5 筆
    await expect(page.getByTestId(T.upcomingWidgetItem)).toHaveCount(5);
  });
});
