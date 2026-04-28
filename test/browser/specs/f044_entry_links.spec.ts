/**
 * F-044: Entry Links Backend
 *
 * Spec: specs/features/f044-entry-links.md
 * Issue: #219
 * QA Issue: #223
 *
 * 涵蓋 Sprint 15 QA scenarios：
 * - 建立 derives_from 連結
 * - 查詢雙向連結（outgoing + incoming）
 * - self-link 拒絕（422 SELF_LINK）
 * - 重複連結拒絕（409 DUPLICATE）
 * - 同 pair 不同 link_type 允許
 * - Entry 刪除時 links cascade
 * - 更新 link_type（PATCH）
 * - 刪除連結（DELETE）
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-044";
const API_BASE = process.env.API_BASE_URL || "http://localhost:8081";

// --- Helper: 模擬 entry links API 回應 ---

function makeLinkResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "link-uuid-1",
    from_id: "entry-a",
    to_id: "entry-b",
    link_type: "derives_from",
    relation: "測試關係",
    confidence: 1.0,
    source: "manual",
    created_at: "2026-04-28T10:00:00Z",
    ...overrides,
  };
}

function makeBidirectionalLinks() {
  return {
    outgoing: [
      makeLinkResponse({ id: "link-1", from_id: "entry-a", to_id: "entry-b", link_type: "derives_from" }),
    ],
    incoming: [
      makeLinkResponse({ id: "link-2", from_id: "entry-c", to_id: "entry-a", link_type: "references" }),
    ],
  };
}

test.describe(`[${FEATURE}] Entry Links Backend`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- Happy Path ---

  test("EL-1 建立 derives_from 連結：POST 回傳 201 含完整欄位", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 entry links API 實作");

    await page.route(`${API_BASE}/api/v1/entries/entry-a/links`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(makeLinkResponse()),
        });
      } else {
        route.continue();
      }
    });

    const resp = await page.request.post(`${API_BASE}/api/v1/entries/entry-a/links`, {
      data: { to_id: "entry-b", link_type: "derives_from", relation: "測試關係" },
    });

    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.link_type).toBe("derives_from");
    expect(body.confidence).toBe(1.0);
    expect(body.source).toBe("manual");
  });

  test("EL-2 查詢雙向連結：GET /entries/A/links 同時回傳 outgoing + incoming", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 entry links API 實作");

    await page.route(`${API_BASE}/api/v1/entries/entry-a/links`, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeBidirectionalLinks()),
        });
      } else {
        route.continue();
      }
    });

    const resp = await page.request.get(`${API_BASE}/api/v1/entries/entry-a/links`);

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.outgoing[0].link_type).toBe("derives_from");
    expect(body.incoming[0].link_type).toBe("references");
  });

  test("EL-3 同 pair 不同 link_type 允許：A→B contradicts 建立成功且 outgoing 含兩條", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 entry links API 實作");

    let callCount = 0;
    await page.route(`${API_BASE}/api/v1/entries/entry-a/links`, (route) => {
      if (route.request().method() === "POST") {
        callCount++;
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(makeLinkResponse({ id: `link-${callCount}`, link_type: "contradicts" })),
        });
      } else if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            outgoing: [
              makeLinkResponse({ link_type: "derives_from" }),
              makeLinkResponse({ id: "link-2", link_type: "contradicts" }),
            ],
            incoming: [],
          }),
        });
      } else {
        route.continue();
      }
    });

    // 建立第二條（不同 link_type）
    const postResp = await page.request.post(`${API_BASE}/api/v1/entries/entry-a/links`, {
      data: { to_id: "entry-b", link_type: "contradicts" },
    });
    expect(postResp.status()).toBe(201);

    // 驗證 outgoing 含兩條
    const getResp = await page.request.get(`${API_BASE}/api/v1/entries/entry-a/links`);
    const body = await getResp.json();
    expect(body.outgoing).toHaveLength(2);
  });

  test("EL-4 更新 link_type：PATCH /entries/links/L1 回傳 200 含新 link_type", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 entry links PATCH API 實作");

    await page.route(`${API_BASE}/api/v1/entries/links/link-1`, (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeLinkResponse({ id: "link-1", link_type: "derives_from" })),
        });
      } else {
        route.continue();
      }
    });

    const resp = await page.request.patch(`${API_BASE}/api/v1/entries/links/link-1`, {
      data: { link_type: "derives_from" },
    });

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.link_type).toBe("derives_from");
  });

  test("EL-5 刪除連結：DELETE /entries/links/L1 回傳 204，GET 不含 L1", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 entry links DELETE API 實作");

    await page.route(`${API_BASE}/api/v1/entries/links/link-1`, (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.route(`${API_BASE}/api/v1/entries/entry-a/links`, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ outgoing: [], incoming: [] }),
        });
      } else {
        route.continue();
      }
    });

    const deleteResp = await page.request.delete(`${API_BASE}/api/v1/entries/links/link-1`);
    expect(deleteResp.status()).toBe(204);

    const getResp = await page.request.get(`${API_BASE}/api/v1/entries/entry-a/links`);
    const body = await getResp.json();
    expect(body.outgoing).toHaveLength(0);
  });

  // --- Edge Cases / Error Handling ---

  test("EL-6 self-link 拒絕：POST to_id = from_id 回傳 422 SELF_LINK", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 entry links 驗證邏輯實作");

    await page.route(`${API_BASE}/api/v1/entries/entry-a/links`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ code: "SELF_LINK", message: "不能建立自我連結" }),
        });
      } else {
        route.continue();
      }
    });

    const resp = await page.request.post(`${API_BASE}/api/v1/entries/entry-a/links`, {
      data: { to_id: "entry-a", link_type: "derives_from" },
    });

    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body.code).toBe("SELF_LINK");
  });

  test("EL-7 重複連結拒絕：相同 pair + link_type 再次 POST 回傳 409 DUPLICATE", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 entry links 唯一性約束實作");

    await page.route(`${API_BASE}/api/v1/entries/entry-a/links`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ code: "DUPLICATE", message: "連結已存在" }),
        });
      } else {
        route.continue();
      }
    });

    const resp = await page.request.post(`${API_BASE}/api/v1/entries/entry-a/links`, {
      data: { to_id: "entry-b", link_type: "derives_from" },
    });

    expect(resp.status()).toBe(409);
    const body = await resp.json();
    expect(body.code).toBe("DUPLICATE");
  });

  test("EL-8 Entry 刪除時 links cascade：DELETE entry B 後 A 的 outgoing 不含 B", async ({ page }) => {
    test.skip(true, "skeleton：等 F-044 CASCADE DELETE migration 實作");

    await page.route(`${API_BASE}/api/v1/entries/entry-b`, (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.route(`${API_BASE}/api/v1/entries/entry-a/links`, (route) => {
      if (route.request().method() === "GET") {
        // B 刪除後，A 的 outgoing 不含 B 相關 links
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ outgoing: [], incoming: [] }),
        });
      } else {
        route.continue();
      }
    });

    const deleteResp = await page.request.delete(`${API_BASE}/api/v1/entries/entry-b`);
    expect(deleteResp.status()).toBe(204);

    const getResp = await page.request.get(`${API_BASE}/api/v1/entries/entry-a/links`);
    const body = await getResp.json();
    // 確認 B 相關連結已被 CASCADE 移除
    const bLinks = body.outgoing.filter(
      (l: { to_id: string }) => l.to_id === "entry-b",
    );
    expect(bLinks).toHaveLength(0);
  });
});
