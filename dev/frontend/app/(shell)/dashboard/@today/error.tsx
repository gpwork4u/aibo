"use client";

import { ErrorCard } from "@/components/shell/error-card";

export default function TodayError({ reset }: { reset: () => void }) {
  return (
    <ErrorCard
      title="Today 載入失敗"
      description="無法取得 Today 資料，請稍後再試"
      onRetry={reset}
    />
  );
}
