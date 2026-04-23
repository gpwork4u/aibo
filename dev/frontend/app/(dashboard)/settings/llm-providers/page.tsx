import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function LlmProvidersPage() {
  return (
    <div>
      <PageHeader title="LLM Provider" description="管理 LLM 服務提供者" />
      <EmptyState
        title="LLM Provider 頁面尚未實作"
        description="此頁面將在 F-024 完成。"
      />
    </div>
  );
}
