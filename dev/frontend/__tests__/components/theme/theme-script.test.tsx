/**
 * F-035 ThemeScript unit tests
 *
 * 驗證 inline init script 的 IIFE 行為：
 *   - localStorage.theme=light → html.classList 含 'light'
 *   - localStorage.theme=dark → html.classList 含 'dark'
 *   - localStorage.theme=system + matchMedia dark → html.dark
 *   - 未設值 + matchMedia light → html.light
 *   - localStorage 被禁用（throw） → fallback 至 system
 *   - 未知值 → fallback 至 system
 *   - 同步在第一次 paint 前執行（透過 React render <ThemeScript /> 確認 inline 字串）
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeScript, __THEME_INIT_SCRIPT__ } from "@/components/theme/theme-script";

/* matchMedia minimal mock */
function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    })),
  });
}

function runScript() {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  new Function(__THEME_INIT_SCRIPT__)();
}

describe("ThemeScript inline init", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.clear();
  });

  it("Scenario: localStorage.theme=light → html.light", () => {
    mockMatchMedia(true); // 系統 dark，但 stored=light 應勝出
    window.localStorage.setItem("theme", "light");
    runScript();
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("Scenario: localStorage.theme=dark → html.dark", () => {
    mockMatchMedia(false);
    window.localStorage.setItem("theme", "dark");
    runScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("Scenario: theme=system + 系統 dark → html.dark", () => {
    mockMatchMedia(true);
    window.localStorage.setItem("theme", "system");
    runScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("Scenario: 無 stored + 系統 light → html.light（預設跟隨系統）", () => {
    mockMatchMedia(false);
    runScript();
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("Scenario: localStorage 被禁用 → fallback system + 仍能套用 class", () => {
    mockMatchMedia(true);
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    runScript();
    // 因為被 catch，stored 為 null → fallback system → 系統 dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    spy.mockRestore();
  });

  it("Scenario: 未知 stored 值 → fallback system", () => {
    mockMatchMedia(false);
    window.localStorage.setItem("theme", "purple");
    runScript();
    // fallback system → 系統 light
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("<ThemeScript /> render 為含初始化邏輯的 inline <script>", () => {
    const { container } = render(<ThemeScript />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
    expect(script!.innerHTML).toContain("prefers-color-scheme");
    expect(script!.innerHTML).toContain("localStorage");
    expect(script!.innerHTML).toContain("data-theme");
  });
});
