"use client";

import { ErrorCard } from "@/components/shell/error-card";

export default function LibraryError({ reset }: { reset: () => void }) {
  return (
    <ErrorCard
      title="Library 載入失敗"
      description="無法取得 Library 資料，請稍後再試"
      onRetry={reset}
    />
  );
}
