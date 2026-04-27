"use client";

/**
 * F-035 ThemeProvider — 自製輕量 theme context（不依賴 next-themes）。
 *
 * 為何不直接用 next-themes？
 *   - F-035 spec 要求 useTheme hook 與 localStorage 持久化邏輯為專案所有，
 *     避免外部套件 lock-in；同時讓 unit test 直接驗證行為。
 *
 * 提供：
 *   - <ThemeProvider> wrapper
 *   - useTheme() hook → { theme, resolvedTheme, setTheme }
 *
 * 行為：
 *   - theme: "light" | "dark" | "system"（使用者選擇）
 *   - resolvedTheme: "light" | "dark"（實際生效）
 *   - setTheme(t) 寫入 localStorage 並更新 <html> class
 *   - 監聽 prefers-color-scheme，theme="system" 時即時切換
 *   - SSR safe：初始 render 不存取 window/localStorage
 */
import * as React from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** localStorage 是否可用（被禁用時為 false） */
  storageAvailable: boolean;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readStoredTheme(): { theme: Theme; storageAvailable: boolean } {
  if (typeof window === "undefined") {
    return { theme: "system", storageAvailable: true };
  }
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") {
      return { theme: v, storageAvailable: true };
    }
    return { theme: "system", storageAvailable: true };
  } catch {
    return { theme: "system", storageAvailable: false };
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** 預設值：未在 localStorage 找到時使用，預設 "system" */
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  // SSR-safe lazy init：first render 用 defaultTheme，避免 hydration mismatch；
  // 真正的 stored 值在 useEffect 內補。
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>("light");
  const [storageAvailable, setStorageAvailable] = React.useState<boolean>(true);

  // 掛載後從 localStorage 同步
  React.useEffect(() => {
    const { theme: stored, storageAvailable: ok } = readStoredTheme();
    setStorageAvailable(ok);
    setThemeState(stored);
  }, []);

  // 計算 resolvedTheme 並套用 class
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const next: ResolvedTheme = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(next);
      applyThemeClass(next);
    };
    compute();

    // 若 theme=system，監聽 prefers-color-scheme 變化
    if (theme === "system" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => compute();
      // 兼容舊版 Safari
      if (mq.addEventListener) {
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      } else if (mq.addListener) {
        mq.addListener(handler);
        return () => mq.removeListener(handler);
      }
    }
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage 被禁用：仍可運作，僅無法持久化 */
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, storageAvailable }),
    [theme, resolvedTheme, setTheme, storageAvailable],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}

/** 內部 helpers 暴露給 unit test */
export const __testing__ = {
  STORAGE_KEY,
  readStoredTheme,
  getSystemTheme,
  applyThemeClass,
};
