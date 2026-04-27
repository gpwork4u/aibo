/**
 * F-035 Design Tokens — globals.css 解析驗證
 *
 * 不在 jsdom 中解析整段 CSS（jsdom 對 @layer / @media 支援有限），
 * 改以正則 + 字串分段驗證 token 完整性：
 *   - light 主題包含全部 editorial tokens（paper / ink / accent / rule / surface 系列）
 *   - dark 主題（.dark + @media）也包含相同的 editorial tokens
 *   - radii / shadows / z-index 變數齊全
 *   - shadcn 相容層 HSL 變數齊全（保證既有元件不壞）
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS_PATH = resolve(__dirname, "../../../app/globals.css");
const css = readFileSync(CSS_PATH, "utf-8");

/** 取出 :root.dark { ... } block 的內容 */
function extractBlock(source: string, selector: string): string {
  const idx = source.indexOf(selector);
  if (idx < 0) return "";
  // 從 selector 之後找到第一個 '{'，再做大括號配對
  const start = source.indexOf("{", idx);
  if (start < 0) return "";
  let depth = 1;
  let i = start + 1;
  while (i < source.length && depth > 0) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    i++;
  }
  return source.slice(start + 1, i - 1);
}

const EDITORIAL_TOKENS = [
  "--paper",
  "--paper-2",
  "--paper-3",
  "--surface",
  "--ink",
  "--ink-2",
  "--ink-3",
  "--ink-4",
  "--rule",
  "--rule-2",
  "--accent",
  "--accent-2",
  "--accent-soft",
];

const SHADCN_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--popover",
  "--primary",
  "--secondary",
  "--muted",
  "--destructive",
  "--warning",
  "--success",
  "--border",
  "--input",
  "--ring",
];

describe("F-035 globals.css design tokens", () => {
  it("light（:root, :root.light）包含所有 editorial tokens", () => {
    const block = extractBlock(css, ":root,\n  :root.light");
    expect(block.length).toBeGreaterThan(0);
    for (const token of EDITORIAL_TOKENS) {
      expect(block).toContain(`${token}:`);
    }
  });

  it("light 包含所有 shadcn 相容 HSL tokens", () => {
    const block = extractBlock(css, ":root,\n  :root.light");
    for (const token of SHADCN_TOKENS) {
      expect(block).toContain(`${token}:`);
    }
  });

  it("light 包含 radii / z-index / shadow 變數", () => {
    const block = extractBlock(css, ":root,\n  :root.light");
    for (const t of [
      "--radius-sm",
      "--radius-md",
      "--radius-lg",
      "--radius-xl",
      "--radius-pill",
      "--z-base",
      "--z-dropdown",
      "--z-modal",
      "--z-toast",
      "--shadow-sm",
      "--shadow-md",
      "--shadow-lg",
    ]) {
      expect(block).toContain(`${t}:`);
    }
  });

  it("dark（:root.dark）包含所有 editorial tokens", () => {
    const block = extractBlock(css, ":root.dark");
    expect(block.length).toBeGreaterThan(0);
    for (const token of EDITORIAL_TOKENS) {
      expect(block).toContain(`${token}:`);
    }
  });

  it("dark 包含所有 shadcn 相容 HSL tokens", () => {
    const block = extractBlock(css, ":root.dark");
    for (const token of SHADCN_TOKENS) {
      expect(block).toContain(`${token}:`);
    }
  });

  it("@media (prefers-color-scheme: dark) 區塊覆寫 editorial tokens", () => {
    // 直接抓 @media 區塊內容
    const idx = css.indexOf("@media (prefers-color-scheme: dark)");
    expect(idx).toBeGreaterThan(-1);
    const block = extractBlock(css.slice(idx), ":root:not(.light)");
    for (const token of EDITORIAL_TOKENS) {
      expect(block).toContain(`${token}:`);
    }
  });

  it("light 與 dark 的 --paper 值不同（確保確實切換）", () => {
    const lightBlock = extractBlock(css, ":root,\n  :root.light");
    const darkBlock = extractBlock(css, ":root.dark");
    const lightPaper = /--paper:\s*([^;]+);/.exec(lightBlock)?.[1].trim();
    const darkPaper = /--paper:\s*([^;]+);/.exec(darkBlock)?.[1].trim();
    expect(lightPaper).toBeTruthy();
    expect(darkPaper).toBeTruthy();
    expect(lightPaper).not.toBe(darkPaper);
  });
});
