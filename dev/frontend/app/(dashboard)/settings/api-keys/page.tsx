import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function ApiKeysPage() {
  return (
    <div>
      <PageHeader title="API Key 管理" description="管理 API 存取金鑰" />
      <EmptyState
        title="API Key 管理尚未實作"
        description="此頁面將在 F-022 完成。"
      />
    </div>
  );
}
