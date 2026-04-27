/**
 * a11y Helper - 基於 axe-core 的 accessibility 掃描
 *
 * 用法：
 *   import { runA11yScan } from "../helpers/a11y";
 *   const violations = await runA11yScan(page, { tags: ["wcag2a", "wcag2aa"] });
 *   expect(violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);
 *
 * 注意：require axe-core/playwright 為 dev dependency；測試前請先 `npm install`。
 */

import type { Page } from "@playwright/test";

export interface A11yViolation {
  id: string;
  impact?: string | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{ html: string; target: string[] }>;
}

export interface A11yScanOptions {
  tags?: string[];
  include?: string[];
  exclude?: string[];
  /**
   * 容許的 violation rule id（暫時 known issue 想跳過時使用，請附上 issue 連結）
   */
  allowlist?: string[];
}

/**
 * 在當前 page 執行 axe-core 掃描，回傳 violations 陣列。
 * 預設掃 wcag2a / wcag2aa。
 */
export async function runA11yScan(
  page: Page,
  opts: A11yScanOptions = {}
): Promise<A11yViolation[]> {
  // dynamic import 避免 axe-core 沒裝時 collect 階段就壞
  const { AxeBuilder } = await import("@axe-core/playwright");
  const tags = opts.tags ?? ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  let builder = new AxeBuilder({ page }).withTags(tags);
  if (opts.include) {
    for (const sel of opts.include) builder = builder.include(sel);
  }
  if (opts.exclude) {
    for (const sel of opts.exclude) builder = builder.exclude(sel);
  }
  const result = await builder.analyze();
  const violations = result.violations as unknown as A11yViolation[];
  if (opts.allowlist?.length) {
    return violations.filter((v) => !opts.allowlist!.includes(v.id));
  }
  return violations;
}

/**
 * 嚴重度過濾：只回 critical / serious 級別的 violations
 */
export function filterCriticalSerious(violations: A11yViolation[]): A11yViolation[] {
  return violations.filter((v) =>
    v.impact === "critical" || v.impact === "serious"
  );
}

/**
 * 把 violations 格式化成易讀字串，附在 expect 失敗訊息上
 */
export function formatViolations(violations: A11yViolation[]): string {
  if (!violations.length) return "(no violations)";
  return violations
    .map((v) => {
      const targets = v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" / ");
      return `[${v.impact ?? "?"}] ${v.id}: ${v.help}\n  → ${targets}\n  ${v.helpUrl}`;
    })
    .join("\n\n");
}
