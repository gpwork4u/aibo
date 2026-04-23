import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function InboxPage() {
  return (
    <div>
      <PageHeader title="Inbox" description="未分類的知識條目" />
      <EmptyState
        title="Inbox 尚未實作"
        description="此頁面將在 F-023 完成。"
      />
    </div>
  );
}
