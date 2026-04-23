import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function CategoriesPage() {
  return (
    <div>
      <PageHeader title="分類管理" description="組織你的知識條目" />
      <EmptyState
        title="分類管理尚未實作"
        description="此頁面將在 F-024 完成。"
      />
    </div>
  );
}
