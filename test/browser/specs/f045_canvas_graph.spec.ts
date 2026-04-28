/**
 * F-045: Canvas Graph View
 *
 * Spec: specs/features/f045-canvas-graph.md
 * Issue: #220
 * QA Issue: #223
 *
 * 涵蓋 Sprint 15 QA scenarios：
 * - 載入全局圖譜（ReactFlow canvas + entryNode 至少 1 個）
 * - 點選節點展開 NodeDetailSheet
 * - 雙擊節點切換 Ego Network（帶 entry_id + depth 參數）
 * - 過濾 link_type（前端過濾，無 API 重新呼叫）
 * - >200 nodes 時顯示 truncated warning banner
 */

import { test, expect } from "@playwright/test";
import { loginWithCookie } from "../helpers/cookie-auth";

const FEATURE = "F-045";
const API_BASE = process.env.API_BASE_URL || "http://localhost:8081";

// --- Helper: 產生假圖譜資料 ---

function makeGraphData(nodeCount = 3) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `entry-${i + 1}`,
    title: `Entry ${i + 1}`,
    category: "Programming",
    tags: ["go"],
  }));

  const edges = nodeCount > 1
    ? [{ id: "link-1", from_id: "entry-1", to_id: "entry-2", link_type: "derives_from" }]
    : [];

  return { nodes, edges, meta: { truncated: false, total: nodeCount } };
}

function makeTruncatedGraphData() {
  const data = makeGraphData(200);
  return { ...data, meta: { truncated: true, total: 350 } };
}

test.describe(`[${FEATURE}] Canvas Graph View`, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    const apiKey = process.env.AIBO_E2E_API_KEY!;
    await loginWithCookie(context, apiKey);
  });

  // --- Happy Path ---

  test("CG-1 載入全局圖譜：/canvas 顯示 ReactFlow canvas 及至少 1 個 entryNode", async ({ page }) => {
    test.skip(true, "skeleton：等 F-045 CanvasPage + React Flow 元件實作");

    await page.route(`${API_BASE}/api/v1/graph*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeGraphData(3)),
      });
    });

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    // ReactFlow canvas 容器
    await expect(page.locator(".react-flow")).toBeVisible();

    // 至少一個 entry node
    const entryNodes = page.locator("[data-testid='entry-node']");
    await expect(entryNodes.first()).toBeVisible();

    // 無 JS console error（基本健康檢查）
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    expect(errors).toHaveLength(0);
  });

  test("CG-2 點選節點展開 NodeDetailSheet：sheet 顯示該 entry title", async ({ page }) => {
    test.skip(true, "skeleton：等 F-045 NodeDetailSheet 元件實作");

    await page.route(`${API_BASE}/api/v1/graph*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeGraphData(2)),
      });
    });

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    // 點選第一個 entry node
    const firstNode = page.locator("[data-testid='entry-node']").first();
    await firstNode.click();

    // NodeDetailSheet 從右側出現
    const sheet = page.getByTestId("node-detail-sheet");
    await expect(sheet).toBeVisible();

    // sheet 顯示對應 entry 的 title
    await expect(sheet.getByText("Entry 1")).toBeVisible();
  });

  test("CG-3 雙擊節點切換 Ego Network：request 含 entry_id + depth=2，toolbar 顯示 Centered on:", async ({ page }) => {
    test.skip(true, "skeleton：等 F-045 Ego Network 模式實作");

    let egoRequestUrl = "";
    await page.route(`${API_BASE}/api/v1/graph*`, (route) => {
      egoRequestUrl = route.request().url();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeGraphData(5)),
      });
    });

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    // 雙擊第一個 node 觸發 ego network
    const firstNode = page.locator("[data-testid='entry-node']").first();
    await firstNode.dblclick();
    await page.waitForLoadState("networkidle");

    // 驗證 request 含 entry_id 和 depth=2
    expect(egoRequestUrl).toContain("entry_id=entry-1");
    expect(egoRequestUrl).toContain("depth=2");

    // toolbar 顯示 "Centered on:"
    await expect(page.getByText(/Centered on:/i)).toBeVisible();
  });

  test("CG-4 過濾 link_type（前端過濾）：取消 references 後邊消失，無 API 重新呼叫", async ({ page }) => {
    test.skip(true, "skeleton：等 F-045 link_type filter toolbar 實作");

    let apiCallCount = 0;
    await page.route(`${API_BASE}/api/v1/graph*`, (route) => {
      apiCallCount++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          nodes: [
            { id: "entry-1", title: "Entry 1" },
            { id: "entry-2", title: "Entry 2" },
            { id: "entry-3", title: "Entry 3" },
          ],
          edges: [
            { id: "link-1", from_id: "entry-1", to_id: "entry-2", link_type: "derives_from" },
            { id: "link-2", from_id: "entry-1", to_id: "entry-3", link_type: "references" },
          ],
          meta: { truncated: false, total: 3 },
        }),
      });
    });

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    const initialCallCount = apiCallCount;

    // 取消勾選 references filter
    const referencesFilter = page.getByTestId("filter-references");
    await referencesFilter.uncheck();

    // references 邊不可見
    const referencesEdges = page.locator("[data-testid='edge-references']");
    await expect(referencesEdges).toHaveCount(0);

    // 沒有額外的 API 呼叫（純前端過濾）
    expect(apiCallCount).toBe(initialCallCount);
  });

  // --- Edge Cases ---

  test("CG-5 truncated warning banner：API 回傳 meta.truncated=true 時顯示 'Showing 200'", async ({ page }) => {
    test.skip(true, "skeleton：等 F-045 truncated warning banner 實作");

    await page.route(`${API_BASE}/api/v1/graph*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeTruncatedGraphData()),
      });
    });

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    // 顯示包含 "Showing 200" 的 warning banner
    await expect(page.getByText(/Showing 200/i)).toBeVisible();
  });
});
