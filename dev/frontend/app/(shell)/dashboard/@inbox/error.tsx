"use client";

import { ErrorCard } from "@/components/shell/error-card";

export default function InboxError({ reset }: { reset: () => void }) {
  return (
    <ErrorCard
      title="Inbox 載入失敗"
      description="無法取得 Inbox 資料，請稍後再試"
      onRetry={reset}
    />
  );
}
