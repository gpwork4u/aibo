import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function SearchPage() {
  return (
    <div>
      <PageHeader title="搜尋" description="全文與語意搜尋你的知識庫" />
      <EmptyState
        title="搜尋頁面尚未實作"
        description="此頁面將在 F-025 完成。"
      />
    </div>
  );
}
