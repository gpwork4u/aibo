/**
 * F-028 / F-029 — LLM Draft 流程
 *
 * 對應 issue：#106（Wave 0 skeleton；Wave 4 補完整 assertion）
 * 對應 spec：
 *   - specs/features/f028-daily-journal.md §POST /journal/:date/draft
 *   - specs/features/f029-journal-frontend.md §LLM 產生 draft 並確認
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

const TARGET = "2026-04-24";

test.describe("Journal — LLM Draft 流程（F-028 + F-029）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa09-journal-draft-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  test("Scenario: 點「讓 AI 產生初稿」→ loading → 內容填入 + DraftBanner 出現", async ({
    page,
  }) => {
    test.skip(true, "Wave 4 — 等 LLM draft 串接完成再啟用");
    // GIVEN 今日尚無 journal；mock POST /draft 回 201 with content
    const draftBody = makeMockJournal(TARGET, {
      is_draft: true,
      generated_by: "llm",
      content: "AI 寫的初稿內容",
      source_refs: [
        { source_type: "entry", source_id: "entry-1" },
        { source_type: "gcal_event", source_id: "ev-1" },
      ],
    });
    await installJournalMock(page, {
      journals: {},
      draft: { status: 201, body: draftBody },
    });

    // WHEN 進入空白編輯器並按「讓 AI 產生初稿」
    await page.goto(`/journal/${TARGET}`);
    await page.getByTestId(J.llmDraftButton).click();

    // THEN loading → 內容填入 + DraftBanner 出現
    await expect(page.getByTestId(J.llmDraftLoading)).toBeVisible();
    await expect(page.getByTestId(J.editorContent)).toHaveValue(/AI 寫的初稿內容/);
    await expect(page.getByTestId(J.draftBanner)).toBeVisible();
  });

  test("Scenario: 點「確認發布」→ DraftBanner 消失", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 confirm draft 流程完成再啟用");
    // GIVEN 今日已有 draft journal
    const journals = {
      [TARGET]: makeMockJournal(TARGET, {
        is_draft: true,
        generated_by: "llm",
        content: "AI 草稿",
      }),
    };
    await installJournalMock(page, { journals });

    // WHEN 進入編輯頁，點「確認發布」
    await page.goto(`/journal/${TARGET}`);
    await expect(page.getByTestId(J.draftBanner)).toBeVisible();
    await page.getByTestId(J.draftBannerConfirmButton).click();

    // THEN DraftBanner 消失（因 PATCH is_draft=false）
    await expect(page.getByTestId(J.draftBanner)).toBeHidden();
  });

  test("Scenario: LLM 503 → toast「LLM 暫時無法使用」", async ({ page }) => {
    test.skip(true, "Wave 4 — 等錯誤處理完成再啟用");
    // GIVEN POST /draft 回 503 LLM_UNAVAILABLE
    await installJournalMock(page, {
      journals: {},
      draft: { status: 503, body: { code: "LLM_UNAVAILABLE" } },
    });

    // WHEN 點「讓 AI 產生初稿」
    await page.goto(`/journal/${TARGET}`);
    await page.getByTestId(J.llmDraftButton).click();

    // THEN 顯示錯誤 toast
    await expect(page.getByTestId(J.toastLlmUnavailable)).toBeVisible();
    // AND 編輯器保持空白
    await expect(page.getByTestId(J.editorContent)).toHaveValue("");
  });

  test("Scenario: Draft 已存在 (非 draft) → 409 後彈衝突 dialog", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 409 衝突 dialog 完成");
    // GIVEN 今日已有 non-draft journal
    // WHEN 嘗試 POST /draft → 409 JOURNAL_EXISTS
    await installJournalMock(page, {
      draft: { status: 409, body: { code: "JOURNAL_EXISTS" } },
    });

    await page.goto(`/journal/${TARGET}`);
    await page.getByTestId(J.llmDraftButton).click();

    // THEN 顯示衝突 dialog
    await expect(page.getByTestId(J.dialogConflict)).toBeVisible();
  });

  test("Scenario: Source Refs Panel 顯示 LLM 引用的 entries / events", async ({ page }) => {
    test.skip(true, "Wave 4 — 等 SourceRefsPanel 完成");
    // GIVEN journal 含 5 entries + 2 events 的 source_refs
    const refs = [
      ...Array.from({ length: 5 }).map((_, i) => ({
        source_type: "entry" as const,
        source_id: `entry-${i + 1}`,
      })),
      { source_type: "gcal_event" as const, source_id: "ev-1" },
      { source_type: "gcal_event" as const, source_id: "ev-2" },
    ];
    const journals = {
      [TARGET]: makeMockJournal(TARGET, {
        is_draft: true,
        generated_by: "llm",
        content: "AI",
        source_refs: refs,
      }),
    };
    await installJournalMock(page, { journals });

    // WHEN 進入編輯頁
    await page.goto(`/journal/${TARGET}`);

    // THEN SourceRefsPanel 顯示 5 entries + 2 events
    await expect(page.getByTestId(J.sourceRefsPanel)).toBeVisible();
    await expect(page.getByTestId(J.sourceRefEntry)).toHaveCount(5);
    await expect(page.getByTestId(J.sourceRefEvent)).toHaveCount(2);
  });
});
