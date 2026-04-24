"use client";

import * as React from "react";

/**
 * 偵測 viewport 是否 < 768px。
 *
 * SSR 安全：首次渲染回傳 false，mount 後依 matchMedia 真實結果更新。
 * 監聽 change 事件以支援視窗縮放 / 裝置旋轉。
 */
export function useIsMobile(query: string = "(max-width: 767px)"): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setIsMobile(mql.matches);
    update();
    // 新舊瀏覽器相容
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, [query]);

  return isMobile;
}
