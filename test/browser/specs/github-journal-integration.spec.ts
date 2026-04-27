/**
 * F-034c / F-034d — GitHub 整合前端 Calendar 顯示測試
 *
 * 對應 issue：#181（Wave 0 skeleton；F-034c/d 實作完成後解 skip）
 * 對應 spec：specs/features/f034-github-commit-integration.md
 *
 * 涵蓋 scenarios：
 *  1. 開 calendar 某天 → DayDetailSheet 自動觸發 journal/auto → content 含 GitHub 條列
 *  2. Journal draft warnings 顯示在 sheet（小字提示）
 *
 * 注意：
 *  - 全部 API（包含後端 journal/auto + GitHub）都用 page.route() mock，不需真實環境
 *  - 測試聚焦在前端 UI 呈現，API 行為由 github-commits-api.spec.ts 覆蓋
 *
 * Wave 0：所有 test 皆 test.skip(true, ...) 包起來。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  GITHUB_JOURNAL_TESTIDS as GJ,
  installGithubMock,
  installJournalAutoMock,
  makeCommit,
  makeCommitsResponse,
} from "../fixtures/github";
import {
  CALENDAR_TESTIDS as T,
  DEFAULT_TEST_TIMEZONE,
  installCalendarMock,
  makeMockDay,
  emptyMonthGrid,
} from "../fixtures/calendar";

test.use({ timezoneId: DEFAULT_TEST_TIMEZONE });

const TARGET_DATE = "2026-04-26";

test.describe("GitHub 整合 — Calendar DayDetailSheet 顯示（F-034c/d）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(
      request,
      `qa12-github-journal-${Date.now()}`,
    );
    await page.goto("/");
    await setupAuth(page, key);
  });

  // ---------------------------------------------------------------------------
  // Scenario 1:
  //   開 calendar 某天 → DayDetailSheet 自動觸發 journal/auto → content 含 GitHub 條列
  // ---------------------------------------------------------------------------
  test("Scenario: 開 DayDetailSheet → journal/auto draft 包含 GitHub 推送條列", async ({
    page,
  }) => {
    test.skip(
      true,
      "Wave 0 — 等 F-034c DayDetailSheet GitHub 區塊 + F-034d journal/auto 整合實作完成再啟用",
    );

    const commits = [
      makeCommit({
        sha: "aaa1111",
        message: "feat(api): add github integration",
        repo: "testuser/aibo",
        committed_at: `${TARGET_DATE}T08:00:00Z`,
      }),
      makeCommit({
        sha: "bbb2222",
        message: "fix(frontend): style tweak",
        repo: "testuser/aibo",
        committed_at: `${TARGET_DATE}T15:30:00Z`,
      }),
    ];

    // GIVEN 已連接 GitHub + 當日 2 筆 commits
    await installGithubMock(page, {
      status: {
        connected: true,
        username: "testuser",
        token_set: true,
        last_synced_at: null,
        last_error: null,
      },
      commitsResponse: {
        status: 200,
        body: makeCommitsResponse(commits),
      },
    });

    // journal/auto 回應包含 ## GitHub 推送區塊
    await installJournalAutoMock(page, {
      response: {
        is_draft: true,
        content: [
          "## 今日回顧",
          "今天專注在 GitHub 整合開發。",
          "",
          "## GitHub 推送",
          "- [aibo] feat(api): add github integration",
          "- [aibo] fix(frontend): style tweak",
        ].join("\n"),
        warnings: [],
        source_refs: [],
      },
    });

    // calendar mock：TARGET_DATE 有日記
    const days = emptyMonthGrid(TARGET_DATE);
    const dayWithJournal = makeMockDay(TARGET_DATE, {
      has_journal: true,
      journal: { id: "journal-001" },
    });
    const dayMap = days.map((d) => (d.date === TARGET_DATE ? dayWithJournal : d));
    await installCalendarMock(page, {
      days: dayMap,
      dayDetails: { [TARGET_DATE]: dayWithJournal },
    });

    // WHEN 開啟 calendar + 打開 DayDetailSheet
    await page.goto(`/calendar?view=month&date=${TARGET_DATE}&sheet=${TARGET_DATE}`);

    // 等待 sheet 出現
    await expect(page.getByTestId(T.sheet)).toBeVisible();

    // THEN journal 區塊出現
    await expect(page.getByTestId(T.sheetSectionJournal)).toBeVisible();

    // THEN GitHub 推送區塊出現（前端渲染 ## GitHub 推送）
    await expect(page.getByTestId(GJ.githubSection)).toBeVisible();

    // THEN GitHub 推送內容包含 commits 條列
    const githubSection = page.getByTestId(GJ.githubSection);
    await expect(githubSection).toContainText("feat(api): add github integration");
    await expect(githubSection).toContainText("fix(frontend): style tweak");
  });

  // ---------------------------------------------------------------------------
  // Scenario 2:
  //   journal draft warnings 顯示在 sheet（小字提示）
  // ---------------------------------------------------------------------------
  test("Scenario: journal auto warnings → DayDetailSheet 顯示小字提示", async ({ page }) => {
    test.skip(
      true,
      "Wave 0 — 等 F-034c DayDetailSheet warnings 提示 UI 實作完成再啟用",
    );

    // GIVEN 已連接 GitHub，但 GitHub API 暫時不可用（degraded）
    await installGithubMock(page, {
      status: {
        connected: true,
        username: "testuser",
        token_set: true,
      },
    });

    // journal/auto 回應：draft 正常生成，warnings 包含 GitHub 失敗提示
    await installJournalAutoMock(page, {
      response: {
        is_draft: true,
        content: "今天完成了一些開發工作...",
        warnings: ["GitHub 暫時無法取得當日 commits，已略過"],
        source_refs: [],
      },
    });

    // calendar mock
    const days = emptyMonthGrid(TARGET_DATE);
    const dayWithJournal = makeMockDay(TARGET_DATE, {
      has_journal: true,
      journal: { id: "journal-002" },
    });
    const dayMap = days.map((d) => (d.date === TARGET_DATE ? dayWithJournal : d));
    await installCalendarMock(page, {
      days: dayMap,
      dayDetails: { [TARGET_DATE]: dayWithJournal },
    });

    // WHEN 開啟 DayDetailSheet
    await page.goto(`/calendar?view=month&date=${TARGET_DATE}&sheet=${TARGET_DATE}`);
    await expect(page.getByTestId(T.sheet)).toBeVisible();

    // THEN journal 區塊出現
    await expect(page.getByTestId(T.sheetSectionJournal)).toBeVisible();

    // THEN warnings 提示顯示在 sheet（小字）
    await expect(page.getByTestId(GJ.githubWarnings)).toBeVisible();
    await expect(page.getByTestId(GJ.githubWarnings)).toContainText("GitHub");

    // THEN GitHub 推送主區塊不應顯示（因為 draft 沒有 commits 區塊）
    // 注意：若 engineer 選擇只隱藏 GJ.githubSection 而顯示 warnings，此 assertion 仍合理
    await expect(page.getByTestId(GJ.githubSection)).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // 附加 Scenario: 未連 GitHub → DayDetailSheet 不顯示 GitHub 相關 UI
  // ---------------------------------------------------------------------------
  test("Scenario: 未連 GitHub → DayDetailSheet 的 journal 區塊不顯示 GitHub 相關 UI", async ({
    page,
  }) => {
    test.skip(
      true,
      "Wave 0 — 等 F-034c GitHub 區塊條件渲染實作完成再啟用",
    );

    // GIVEN 未連接 GitHub
    await installGithubMock(page, { status: { connected: false } });

    // journal/auto 回應：無 GitHub 內容
    await installJournalAutoMock(page, {
      response: {
        is_draft: true,
        content: "今天寫了一些筆記...",
        warnings: [],
        source_refs: [],
      },
    });

    // calendar mock
    const days = emptyMonthGrid(TARGET_DATE);
    const dayWithJournal = makeMockDay(TARGET_DATE, {
      has_journal: true,
      journal: { id: "journal-003" },
    });
    const dayMap = days.map((d) => (d.date === TARGET_DATE ? dayWithJournal : d));
    await installCalendarMock(page, {
      days: dayMap,
      dayDetails: { [TARGET_DATE]: dayWithJournal },
    });

    // WHEN 開啟 DayDetailSheet
    await page.goto(`/calendar?view=month&date=${TARGET_DATE}&sheet=${TARGET_DATE}`);
    await expect(page.getByTestId(T.sheet)).toBeVisible();

    // THEN journal 區塊可見（draft 正常）
    await expect(page.getByTestId(T.sheetSectionJournal)).toBeVisible();

    // THEN GitHub 專屬 UI 不顯示
    await expect(page.getByTestId(GJ.githubSection)).toBeHidden();
    await expect(page.getByTestId(GJ.githubWarnings)).toBeHidden();
  });
});
