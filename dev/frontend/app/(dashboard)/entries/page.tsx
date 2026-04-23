import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function EntriesPage() {
  return (
    <div>
      <PageHeader title="知識條目" description="管理你的知識庫" />
      <EmptyState
        title="知識條目頁面尚未實作"
        description="此頁面將在 F-023 完成。"
      />
    </div>
  );
}
