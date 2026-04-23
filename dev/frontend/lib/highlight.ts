/**
 * 輕量級 highlight sanitizer。
 *
 * 後端 `matched_keywords` 回傳後，前端需在 `summary` / `content_preview` 上
 * 自行插入 `<mark>` 標記。為避免 XSS，我們：
 *
 * 1. 先 escape HTML
 * 2. 再針對 `matched_keywords` 做大小寫不敏感替換，包上 `<mark>`
 *
 * 如此輸出的 HTML 只會含 `<mark>…</mark>`，其他都是 escape 過的文字。
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 將 `text` 中匹配 `keywords` 的部分以 `<mark>` 包裹。
 * - 回傳值已 HTML-escape，可安全用於 dangerouslySetInnerHTML。
 * - 大小寫不敏感。
 */
export function highlightKeywords(text: string, keywords: string[] | undefined): string {
  const escaped = escapeHtml(text ?? "");
  if (!keywords || keywords.length === 0) return escaped;

  // 過濾空字串並按長度降冪，避免短詞先吃掉長詞的子字串。
  const valid = keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  if (valid.length === 0) return escaped;

  const re = new RegExp(`(${valid.join("|")})`, "gi");
  return escaped.replace(re, '<mark class="bg-yellow-200 dark:bg-yellow-900/60 rounded px-0.5">$1</mark>');
}
