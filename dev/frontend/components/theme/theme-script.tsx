/**
 * F-035 ThemeScript — 在第一次 paint 前同步套用 light/dark class，避免 FOUC。
 *
 * 注入策略：使用原生 <script> 並透過 dangerouslySetInnerHTML，因為 next/script
 * 即使 strategy="beforeInteractive" 也會在 hydration 時執行，無法早於 paint。
 *
 * 行為：
 *   1. 嘗試讀 localStorage.theme （可能為 "light" | "dark" | "system" | null）
 *   2. 若禁用 localStorage（try/catch 捕獲），預設 system
 *   3. system → 用 matchMedia('(prefers-color-scheme: dark)') 決定
 *   4. 把對應 class 加到 <html>（'.dark' 或 '.light'）
 *
 * 注意：此 script 需 SSR 輸出 inline、放在 <head> 或 <body> 開頭。
 */
const themeInitScript = `
(function () {
  try {
    var stored = null;
    try { stored = window.localStorage.getItem('theme'); } catch (e) { stored = null; }
    var theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.setAttribute('data-theme', resolved);
  } catch (e) {
    /* 任何錯誤都靜默 fallback：什麼都不做，CSS 會以 prefers-color-scheme 為準 */
  }
})();
`;

export function ThemeScript() {
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}

/** 匯出 raw script 字串供 unit test 驗證 */
export const __THEME_INIT_SCRIPT__ = themeInitScript;
