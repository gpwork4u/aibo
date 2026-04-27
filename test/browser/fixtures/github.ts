/**
 * GitHub 整合測試共用 fixtures 與 testid 常數（Sprint 12, F-034）
 *
 * 所有 GitHub API 與後端都用 page.route() 攔截，不需真實環境。
 *
 * 對應 issue：#181
 * 對應 spec：specs/features/f034-github-commit-integration.md
 */

import type { Page, Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// data-testid 常數（對齊 dev/frontend/lib/github/testids.ts GITHUB_TESTIDS）
// ---------------------------------------------------------------------------

export const GITHUB_SETTINGS_TESTIDS = {
  // 側邊欄導航連結
  navGithub: "nav-github",

  // 連接狀態 badge（已連接 / 未連接）
  statusBadge: "github-status-badge",

  // PAT 輸入欄位
  patInput: "github-token-input",

  // 「連接」按鈕
  connectButton: "github-connect-button",

  // 「中斷連接」按鈕
  disconnectButton: "github-disconnect-button",

  // AlertDialog 內的「確認中斷」按鈕
  disconnectDialogConfirm: "github-disconnect-confirm-button",

  // 已連接時顯示的 GitHub username
  usernameLabel: "github-username-display",

  // ConnectForm submit 失敗時的即時錯誤訊息
  errorMessage: "github-error-message",

  // 已連接狀態下 status.last_error 的顯示訊息
  lastErrorMessage: "github-last-error-message",

  // 已連接時「更新 PAT」場景的 submit 按鈕
  updatePatButton: "github-update-pat-button",
} as const;

export const GITHUB_JOURNAL_TESTIDS = {
  // DayDetailSheet 中的 journal section
  githubSection: "journal-github-section",
  githubWarnings: "journal-github-warnings",
} as const;

// ---------------------------------------------------------------------------
// Mock data shapes
// ---------------------------------------------------------------------------

export interface MockGithubStatus {
  connected: boolean;
  id?: string;
  username?: string;
  scopes?: string[];
  token_set?: boolean;
  last_synced_at?: string | null;
  last_error?: string | null;
  last_error_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MockGithubCommit {
  sha: string;
  repo: string;
  message: string;
  url: string;
  committed_at: string;
  additions?: number | null;
  deletions?: number | null;
}

export interface MockGithubCommitsResponse {
  date: string;
  username: string;
  commits: MockGithubCommit[];
  total: number;
  truncated: boolean;
  warning?: string | null;
}

export interface InstallGithubMockOpts {
  /** GET /status 回應 */
  status?: MockGithubStatus;
  /** POST /connect 回應 */
  connectResponse?:
    | { status: 201; body: MockGithubStatus }
    | { status: 400; body: { code: string; message: string } }
    | { status: 422; body: { code: string; message: string } }
    | { status: 503; body: { code: string; message: string } };
  /** DELETE 回應（預設 204） */
  deleteResponse?: { status: 204 } | { status: 404; body: { code: string } };
  /** GET /commits 回應 */
  commitsResponse?:
    | { status: 200; body: MockGithubCommitsResponse }
    | { status: 400; body: { code: string; message: string } }
    | { status: 404; body: { code: string; message: string } }
    | { status: 422; body: { code: string; message: string } }
    | { status: 429; body: { code: string; message: string; retry_after_seconds: number } }
    | { status: 503; body: { code: string; message: string } };
  /** 請求錄製器（用於斷言 request 發送情況） */
  recorder?: {
    requests: Array<{ url: string; method: string; body?: unknown }>;
  };
}

/**
 * 安裝 `/api/v1/integrations/github*` 的 mock。
 *
 * 攔截所有 GitHub 整合相關 API，不需真實後端。
 */
export async function installGithubMock(
  page: Page,
  opts: InstallGithubMockOpts = {},
): Promise<void> {
  const defaultStatus: MockGithubStatus = opts.status ?? { connected: false };

  await page.route("**/api/v1/integrations/github**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (opts.recorder) {
      let body: unknown = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        // ignore non-JSON bodies
      }
      opts.recorder.requests.push({ url, method, body });
    }

    // GET /status
    if (method === "GET" && /\/integrations\/github\/status/.test(url)) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(defaultStatus),
      });
      return;
    }

    // GET /commits
    if (method === "GET" && /\/integrations\/github\/commits/.test(url)) {
      const resp = opts.commitsResponse ?? {
        status: 200,
        body: {
          date: new Date().toISOString().slice(0, 10),
          username: defaultStatus.username ?? "testuser",
          commits: [],
          total: 0,
          truncated: false,
          warning: null,
        },
      };
      await route.fulfill({
        status: resp.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resp.body),
      });
      return;
    }

    // POST /connect
    if (method === "POST" && /\/integrations\/github\/connect/.test(url)) {
      const resp = opts.connectResponse ?? {
        status: 201,
        body: {
          connected: true,
          id: "mock-uuid",
          username: defaultStatus.username ?? "testuser",
          scopes: ["repo", "read:user"],
          token_set: true,
          last_synced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
      await route.fulfill({
        status: resp.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resp.body),
      });
      return;
    }

    // DELETE /integrations/github（精確匹配，避免吃到 /status 等子路由）
    if (method === "DELETE" && /\/integrations\/github\/?$/.test(url)) {
      const resp = opts.deleteResponse ?? { status: 204 };
      if (resp.status === 204) {
        await route.fulfill({
          status: 204,
          headers: {},
          body: "",
        });
      } else {
        await route.fulfill({
          status: resp.status,
          headers: { "content-type": "application/json" },
          body: JSON.stringify("body" in resp ? resp.body : {}),
        });
      }
      return;
    }

    await route.continue();
  });
}

/**
 * 安裝 journal auto draft mock（POST /api/v1/journal/:date/auto）
 *
 * 用於測試 journal draft 含/不含 GitHub commits 區塊的場景。
 */
export interface MockJournalAutoResponse {
  content: string;
  is_draft: boolean;
  warnings?: string[];
  source_refs?: unknown[];
}

export interface InstallJournalAutoMockOpts {
  response: MockJournalAutoResponse;
  /** HTTP status code，預設 201 */
  status?: number;
  recorder?: {
    requests: Array<{ url: string; method: string; body?: unknown }>;
  };
}

export async function installJournalAutoMock(
  page: Page,
  opts: InstallJournalAutoMockOpts,
): Promise<void> {
  await page.route("**/api/v1/journal/*/auto", async (route: Route) => {
    const req = route.request();
    if (opts.recorder) {
      let body: unknown = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        // ignore
      }
      opts.recorder.requests.push({ url: req.url(), method: req.method(), body });
    }
    await route.fulfill({
      status: opts.status ?? 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts.response),
    });
  });
}

// ---------------------------------------------------------------------------
// 常用 commit fixture 工廠
// ---------------------------------------------------------------------------

export function makeCommit(overrides: Partial<MockGithubCommit> = {}): MockGithubCommit {
  return {
    sha: "abc1234",
    repo: "testuser/aibo",
    message: "feat: test commit",
    url: "https://github.com/testuser/aibo/commit/abc1234",
    committed_at: "2026-04-26T08:00:00Z",
    additions: 10,
    deletions: 3,
    ...overrides,
  };
}

export function makeCommitsResponse(
  commits: MockGithubCommit[],
  overrides: Partial<MockGithubCommitsResponse> = {},
): MockGithubCommitsResponse {
  return {
    date: "2026-04-26",
    username: "testuser",
    commits,
    total: commits.length,
    truncated: false,
    warning: null,
    ...overrides,
  };
}
