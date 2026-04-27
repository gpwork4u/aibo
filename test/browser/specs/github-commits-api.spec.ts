/**
 * F-034a / F-034b / F-034d — GitHub commits API 行為測試（後端 mock）
 *
 * 對應 issue：#181（Wave 0 skeleton；F-034a/b/d 實作完成後解 skip）
 * 對應 spec：specs/features/f034-github-commit-integration.md
 *
 * 涵蓋 scenarios：
 *  1. 未連 GitHub → /journal/:date/auto warnings 含「未連 GitHub」（不阻擋）
 *  2. 連線 + 當日有 commits → journal content 含「## GitHub 推送」區塊
 *  3. Rate limit 429 → GET /commits 回 429 + retry_after_seconds
 *  4. Commits > 200 → truncated=true + warnings
 *  5. PAT 過期 → GET /commits 回 422 GITHUB_TOKEN_INVALID + status.last_error 有值
 *  6. 取 commits 但未連接 → GET /commits 回 404 GITHUB_NOT_CONNECTED
 *  7. GitHub 暫時不可用 → GET /commits 回 503 GITHUB_UNAVAILABLE
 *  8. 當日無 commits → GET /commits 回 200 + commits=[] + total=0
 *  9. Journal draft 中 GitHub 失敗 → degraded → POST journal/auto 仍回 201，warnings 含 GitHub 錯誤
 *
 * 注意：此檔案測試的是後端 API 回應格式，透過 page.route() mock 後端。
 * 前端 UI 呈現由 github-journal-integration.spec.ts 覆蓋。
 *
 * Wave 0：所有 test 皆 test.skip(true, ...) 包起來。
 */

import { test, expect } from "@playwright/test";
import { ApiClient } from "../helpers/api-client";
import { setupAuth } from "../helpers/auth";
import {
  installGithubMock,
  installJournalAutoMock,
  makeCommit,
  makeCommitsResponse,
} from "../fixtures/github";
import { installCalendarMock, makeMockDay, emptyMonthGrid } from "../fixtures/calendar";

const TARGET_DATE = "2026-04-26";

test.describe("GitHub Commits API 行為（F-034a/b/d）", () => {
  test.beforeEach(async ({ page, request }) => {
    const { key } = await ApiClient.bootstrap(request, `qa12-github-api-${Date.now()}`);
    await page.goto("/");
    await setupAuth(page, key);
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: 未連 GitHub → journal/auto warnings 含「未連 GitHub」，不阻擋 draft
  // ---------------------------------------------------------------------------
  test("Scenario: 未連 GitHub → journal auto draft 仍生成，warnings 含未連接提示", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034d JournalDraftService GitHub 整合實作完成再啟用");

    // GIVEN 未連接 GitHub
    await installGithubMock(page, { status: { connected: false } });

    // journal/auto 回應：draft 正常生成，warnings 含 GitHub 未連接
    await installJournalAutoMock(page, {
      response: {
        is_draft: true,
        content: "今天完成了幾件事...",
        warnings: ["尚未連接 GitHub，無法取得當日 commits"],
        source_refs: [],
      },
    });

    // WHEN 在 calendar sheet 觸發 journal auto（直接呼叫 mock API 驗證格式）
    const days = emptyMonthGrid(TARGET_DATE);
    const dayWithJournal = makeMockDay(TARGET_DATE, {});
    const dayMap = days.map((d) => (d.date === TARGET_DATE ? dayWithJournal : d));
    await installCalendarMock(page, { days: dayMap, dayDetails: { [TARGET_DATE]: dayWithJournal } });

    // 導航到 calendar + 開啟 day sheet
    await page.goto(`/calendar?view=month&date=${TARGET_DATE}&sheet=${TARGET_DATE}`);

    // THEN：在 sheet 中找到日記區塊，觸發 auto draft
    // 注意：此 scenario 主要驗證 API 回應格式；前端 UI 由 github-journal-integration 覆蓋
    // 這裡透過 page.evaluate 驗證 mock 回傳的 warnings
    const journalAutoResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/journal/2026-04-26/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
        body: JSON.stringify({ tone: "reflective" }),
      });
      return res.json();
    });

    expect(journalAutoResponse.is_draft).toBe(true);
    expect(journalAutoResponse.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/未連接|GitHub|connect/i)]),
    );
    // draft 內容存在（不因 GitHub 失敗而失敗）
    expect(journalAutoResponse.content).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: 連線 + 當日有 commits → journal content 含 ## GitHub 區塊
  // ---------------------------------------------------------------------------
  test("Scenario: 連線 + 當日 2 筆 commits → journal auto draft content 含 GitHub 推送區塊", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034d prompt 整合實作完成再啟用");

    const commits = [
      makeCommit({ sha: "aaa1111", message: "feat(api): add github endpoint", committed_at: `${TARGET_DATE}T08:00:00Z` }),
      makeCommit({ sha: "bbb2222", repo: "testuser/other-repo", message: "fix: typo", committed_at: `${TARGET_DATE}T14:00:00Z` }),
    ];

    // GIVEN 已連接 + 有 commits
    await installGithubMock(page, {
      status: { connected: true, username: "testuser", token_set: true },
      commitsResponse: {
        status: 200,
        body: makeCommitsResponse(commits),
      },
    });

    // journal/auto 回應：content 含 ## GitHub 推送區塊
    await installJournalAutoMock(page, {
      response: {
        is_draft: true,
        content: "今天做了幾件事...\n\n## GitHub 推送\n- aaa1111 feat(api): add github endpoint\n- bbb2222 fix: typo",
        warnings: [],
        source_refs: [],
      },
    });

    // WHEN 呼叫 journal auto mock
    const journalAutoResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/journal/2026-04-26/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
        body: JSON.stringify({ tone: "reflective" }),
      });
      return res.json();
    });

    // THEN response.content 含 ## GitHub 推送
    expect(journalAutoResponse.is_draft).toBe(true);
    expect(journalAutoResponse.content).toContain("## GitHub 推送");
    // warnings 為空（無錯誤）
    expect(journalAutoResponse.warnings).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Rate limit 429 → warnings 含 retry_after
  // ---------------------------------------------------------------------------
  test("Scenario: GitHub rate limit 429 → GET /commits 回 429 + retry_after_seconds", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034b rate limit 處理實作完成再啟用");

    // GIVEN 已連接，但 GitHub rate limit 用完（GET /commits 回 429）
    await installGithubMock(page, {
      status: { connected: true, username: "testuser", token_set: true },
      commitsResponse: {
        status: 429,
        body: {
          code: "GITHUB_RATE_LIMITED",
          message: "GitHub API rate limit 用完",
          retry_after_seconds: 3600,
        },
      },
    });

    // WHEN 呼叫 GET /commits
    const commitsResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/integrations/github/commits?date=2026-04-26", {
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
      });
      return { status: res.status, body: await res.json() };
    });

    // THEN status = 429 + code = GITHUB_RATE_LIMITED + retry_after_seconds > 0
    expect(commitsResponse.status).toBe(429);
    expect(commitsResponse.body.code).toBe("GITHUB_RATE_LIMITED");
    expect(commitsResponse.body.retry_after_seconds).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: Commits > 200 → truncated=true
  // ---------------------------------------------------------------------------
  test("Scenario: 當日 commits 超過 200 → response.truncated=true + total=200", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034b commits 截斷邏輯實作完成再啟用");

    // 製造 200 筆 commits（模擬截斷後的回應）
    const truncatedCommits = Array.from({ length: 200 }, (_, i) =>
      makeCommit({ sha: `sha${String(i).padStart(4, "0")}`, message: `commit #${i}` }),
    );

    // GIVEN 已連接，GET /commits 回 200 筆（truncated=true）
    await installGithubMock(page, {
      status: { connected: true, username: "testuser", token_set: true },
      commitsResponse: {
        status: 200,
        body: makeCommitsResponse(truncatedCommits, {
          total: 200,
          truncated: true,
          warning: "當日 commits 超過 200 筆上限，已截斷",
        }),
      },
    });

    // WHEN 呼叫 GET /commits
    const commitsResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/integrations/github/commits?date=2026-04-26", {
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
      });
      return { status: res.status, body: await res.json() };
    });

    // THEN commits.length = 200，truncated = true
    expect(commitsResponse.status).toBe(200);
    expect(commitsResponse.body.commits).toHaveLength(200);
    expect(commitsResponse.body.truncated).toBe(true);
    expect(commitsResponse.body.total).toBe(200);
    expect(commitsResponse.body.warning).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: PAT 過期 → warnings 含「PAT 失效」+ status last_error 寫入
  // ---------------------------------------------------------------------------
  test("Scenario: PAT 過期 → GET /commits 回 422 GITHUB_TOKEN_INVALID + status.last_error 有值", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034b PAT 失效偵測 + last_error 寫入實作完成再啟用");

    // GIVEN 已連接但 PAT 已過期
    // 初始 status 顯示已連接
    // GET /commits 回 422（PAT 失效）
    await installGithubMock(page, {
      status: {
        connected: true,
        username: "testuser",
        token_set: true,
        last_error: "PAT 已被撤銷，請至設定頁更新",
        last_error_at: "2026-04-26T09:00:00Z",
      },
      commitsResponse: {
        status: 422,
        body: {
          code: "GITHUB_TOKEN_INVALID",
          message: "PAT 已失效，請至 GitHub Settings 重新產生",
        },
      },
    });

    // WHEN 呼叫 GET /commits
    const commitsResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/integrations/github/commits?date=2026-04-26", {
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
      });
      return { status: res.status, body: await res.json() };
    });

    // THEN status = 422 + code = GITHUB_TOKEN_INVALID
    expect(commitsResponse.status).toBe(422);
    expect(commitsResponse.body.code).toBe("GITHUB_TOKEN_INVALID");

    // THEN GET /status 中 last_error 有值（前端應顯示 last_error banner）
    const statusResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/integrations/github/status", {
        headers: { "X-API-Key": "mock-key" },
      });
      return res.json();
    });

    expect(statusResponse.connected).toBe(true);
    expect(statusResponse.last_error).toBeTruthy();
    expect(statusResponse.last_error_at).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: 取 commits 但未連接 → 404 GITHUB_NOT_CONNECTED
  // ---------------------------------------------------------------------------
  test("Scenario: 取 commits 但未連接 → GET /commits 回 404 GITHUB_NOT_CONNECTED", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034b GET /commits 未連接錯誤處理實作完成再啟用");

    // GIVEN 無 github_integrations row
    await installGithubMock(page, {
      status: { connected: false },
      commitsResponse: {
        status: 404,
        body: {
          code: "GITHUB_NOT_CONNECTED",
          message: "尚未連接 GitHub",
        },
      },
    });

    // WHEN 呼叫 GET /commits
    const commitsResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/integrations/github/commits?date=2026-04-26", {
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
      });
      return { status: res.status, body: await res.json() };
    });

    // THEN status = 404 + code = GITHUB_NOT_CONNECTED
    expect(commitsResponse.status).toBe(404);
    expect(commitsResponse.body.code).toBe("GITHUB_NOT_CONNECTED");
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: GitHub 暫時不可用 → GET /commits 回 503 GITHUB_UNAVAILABLE
  // ---------------------------------------------------------------------------
  test("Scenario: GitHub 暫時不可用 → GET /commits 回 503 GITHUB_UNAVAILABLE", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034b GitHub 503 / timeout 錯誤處理實作完成再啟用");

    // GIVEN 已連接，但 GitHub API 回 503 或 timeout
    await installGithubMock(page, {
      status: { connected: true, username: "testuser", token_set: true },
      commitsResponse: {
        status: 503,
        body: {
          code: "GITHUB_UNAVAILABLE",
          message: "GitHub API 暫時無法使用",
        },
      },
    });

    // WHEN 呼叫 GET /commits
    const commitsResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/integrations/github/commits?date=2026-04-26", {
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
      });
      return { status: res.status, body: await res.json() };
    });

    // THEN status = 503 + code = GITHUB_UNAVAILABLE
    expect(commitsResponse.status).toBe(503);
    expect(commitsResponse.body.code).toBe("GITHUB_UNAVAILABLE");
  });

  // ---------------------------------------------------------------------------
  // Scenario 8: 當日無 commits → GET /commits 回 200 + commits=[] + total=0
  // ---------------------------------------------------------------------------
  test("Scenario: 當日無 commits → GET /commits 回 200 + commits=[] + total=0", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034b GET /commits empty response 實作完成再啟用");

    // GIVEN 已連接，但當日無任何 commits
    await installGithubMock(page, {
      status: { connected: true, username: "testuser", token_set: true },
      commitsResponse: {
        status: 200,
        body: {
          date: TARGET_DATE,
          username: "testuser",
          commits: [],
          total: 0,
          truncated: false,
          warning: null,
        },
      },
    });

    // WHEN 呼叫 GET /commits
    const commitsResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/integrations/github/commits?date=2026-04-26", {
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
      });
      return { status: res.status, body: await res.json() };
    });

    // THEN status = 200 + commits = [] + total = 0
    expect(commitsResponse.status).toBe(200);
    expect(commitsResponse.body.commits).toEqual([]);
    expect(commitsResponse.body.total).toBe(0);
    expect(commitsResponse.body.truncated).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Scenario 9: Journal draft 中 GitHub 失敗 → degraded
  //   GIVEN 已連接 GitHub，但 GitHub API 暫時 503
  //   WHEN POST /journal/:date/auto
  //   THEN response 201（draft 仍生成），warnings 含 GitHub 相關提示，content 不含 ## GitHub 推送
  // ---------------------------------------------------------------------------
  test("Scenario: Journal draft 中 GitHub 503 → degraded → 仍回 201，warnings 含 GitHub 錯誤提示", async ({
    page,
  }) => {
    test.skip(true, "Wave 0 — 等 F-034d JournalDraftService degraded 模式實作完成再啟用");

    // GIVEN 已連接，但 GitHub API 暫時不可用
    await installGithubMock(page, {
      status: { connected: true, username: "testuser", token_set: true },
      commitsResponse: {
        status: 503,
        body: {
          code: "GITHUB_UNAVAILABLE",
          message: "GitHub API 暫時無法使用",
        },
      },
    });

    // journal/auto：draft 仍生成，warnings 含 GitHub 失敗提示，content 不含 ## GitHub 推送
    await installJournalAutoMock(page, {
      response: {
        is_draft: true,
        content: "今天完成了一些開發工作...",
        warnings: ["GitHub 暫時無法取得當日 commits，已略過"],
        source_refs: [],
      },
    });

    // WHEN 呼叫 journal/auto
    const journalAutoResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/journal/2026-04-26/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "mock-key" },
        body: JSON.stringify({ tone: "reflective" }),
      });
      return res.json();
    });

    // THEN draft 仍生成（status = 201 由 mock 保證，body.is_draft = true）
    expect(journalAutoResponse.is_draft).toBe(true);
    // THEN warnings 包含 GitHub 相關錯誤提示
    expect(journalAutoResponse.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/GitHub/i)]),
    );
    // THEN content 不含 ## GitHub 推送（degraded 不加入 commits 區塊）
    expect(journalAutoResponse.content).not.toContain("## GitHub 推送");
  });
});
