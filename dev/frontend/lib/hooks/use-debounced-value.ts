"use client";

import { useEffect, useState } from "react";

/**
 * 回傳 `value` 在靜止 `delayMs` 毫秒後的快照。
 * 適用於搜尋框 debounce（預設 500ms）。
 */
export function useDebouncedValue<T>(value: T, delayMs = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
