"use client";

import { PageHeader } from "@/components/page-header";
import { GcalStatusCard } from "@/components/gcal-settings/gcal-status-card";

export default function GcalSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Calendar"
        description="連結 Google 帳號以整合日曆事件"
      />
      <GcalStatusCard />
    </div>
  );
}
