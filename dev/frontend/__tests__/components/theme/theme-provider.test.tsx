/**
 * F-035 ThemeProvider unit tests
 *
 * Scenarios 覆蓋：
 *   - 預設跟隨系統（無 localStorage 設定 + prefers-color-scheme=dark → resolvedTheme=dark）
 *   - 手動切換 light：寫入 localStorage + html class 更新
 *   - 重新載入保留偏好（localStorage.theme=light → 初始即 light）
 *   - localStorage 被禁用：仍可運作 + storageAvailable=false
 *   - theme=system 時系統主題變化即時切換
 *   - useTheme 在 Provider 外使用會 throw
 */
import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ThemeProvider,
  useTheme,
  __testing__,
} from "@/components/theme/theme-provider";

/* ---------- matchMedia mock helper ---------- */
type MQListener = (e: MediaQueryListEvent) => void;

function installMatchMedia(initialDark: boolean) {
  const listeners = new Set<MQListener>();
  let matches = initialDark;

  const factory = (query: string): MediaQueryList => {
    const mql: Partial<MediaQueryList> & {
      _emit: (next: boolean) => void;
    } = {
      media: query,
      get matches() {
        return query === "(prefers-color-scheme: dark)" ? matches : false;
      },
      onchange: null,
      addEventListener: (type: string, cb: EventListener) => {
        if (type === "change") listeners.add(cb as unknown as MQListener);
      },
      removeEventListener: (type: string, cb: EventListener) => {
        if (type === "change") listeners.delete(cb as unknown as MQListener);
      },
      addListener: (cb: MQListener) => listeners.add(cb),
      removeListener: (cb: MQListener) => listeners.delete(cb),
      dispatchEvent: () => true,
      _emit: (next: boolean) => {
        matches = next;
        const evt = { matches: next, media: query } as MediaQueryListEvent;
        listeners.forEach((l) => l(evt));
      },
    };
    return mql as MediaQueryList;
  };

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(factory),
  });

  return {
    setMatches(next: boolean) {
      matches = next;
    },
    emit(next: boolean) {
      matches = next;
      const evt = { matches: next, media: "(prefers-color-scheme: dark)" } as MediaQueryListEvent;
      listeners.forEach((l) => l(evt));
    },
  };
}

function Probe() {
  const { theme, resolvedTheme, setTheme, storageAvailable } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="resolved">{resolvedTheme}</div>
      <div data-testid="storage">{String(storageAvailable)}</div>
      <button data-testid="set-light" onClick={() => setTheme("light")}>L</button>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>D</button>
      <button data-testid="set-system" onClick={() => setTheme("system")}>S</button>
    </div>
  );
}

describe("ThemeProvider / useTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Scenario: 預設跟隨系統 — prefers-color-scheme=dark → resolvedTheme=dark + html.dark", () => {
    installMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("Scenario: 預設跟隨系統 — prefers-color-scheme=light → resolvedTheme=light", () => {
    installMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("Scenario: 手動切換 light — localStorage 寫入 + html class 切換", async () => {
    installMatchMedia(true);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved").textContent).toBe("dark");

    await user.click(screen.getByTestId("set-light"));

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(window.localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("Scenario: 重新載入保留偏好 — localStorage.theme=light → 初始 resolvedTheme=light", async () => {
    installMatchMedia(true); // 系統 dark，但 stored=light 應勝出
    window.localStorage.setItem("theme", "light");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    // useEffect 同步後
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("Scenario: localStorage 被禁用 — storageAvailable=false 且仍可運作", () => {
    installMatchMedia(false);
    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("storage").textContent).toBe("false");
    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    getItemSpy.mockRestore();
  });

  it("Scenario: theme=system 時 prefers-color-scheme 變化即時切換", () => {
    const mq = installMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved").textContent).toBe("light");

    act(() => {
      mq.emit(true);
    });

    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("useTheme 在 Provider 外使用應 throw", () => {
    // 抑制預期的 console.error（React 會 log error boundary）
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bare() {
      useTheme();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/ThemeProvider/);
    errSpy.mockRestore();
  });

  it("internal helpers — applyThemeClass 移除舊 class 並設置新 class", () => {
    document.documentElement.classList.add("light");
    __testing__.applyThemeClass("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("internal helpers — readStoredTheme 對未知值回傳 system", () => {
    window.localStorage.setItem("theme", "bogus-value");
    expect(__testing__.readStoredTheme().theme).toBe("system");
  });
});
