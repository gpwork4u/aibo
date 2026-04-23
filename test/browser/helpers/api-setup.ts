/**
 * Test Data Setup - 提供測試前資料準備與清理 helpers
 *
 * 使用情境：
 * - 預先建立多筆 entries 測試列表與分頁
 * - 預先建立 category 測試篩選
 * - 預先建立 LLM provider 測試健康檢查
 */

import { ApiClient } from "./api-client";

export interface SeedOptions {
  entries?: number;
  categories?: number;
  providers?: number;
}

/**
 * 建立 N 筆測試 entries
 */
export async function seedEntries(
  client: ApiClient,
  count: number,
  opts: { categoryId?: string; titlePrefix?: string } = {}
): Promise<Array<{ id: string; title?: string }>> {
  const prefix = opts.titlePrefix ?? "Test Entry";
  const created = [];
  for (let i = 0; i < count; i++) {
    const entry = await client.createEntry({
      title: `${prefix} ${i + 1}`,
      content: `這是第 ${i + 1} 筆測試條目的內容。\n\n## 子標題\n\n- item ${i}\n- item ${i + 1}`,
      category_id: opts.categoryId,
      tags: ["test", `batch-${Math.floor(i / 5)}`],
    });
    created.push({ id: entry.id, title: entry.title });
  }
  return created;
}

/**
 * 建立一個測試用分類
 */
export async function seedCategory(
  client: ApiClient,
  name = `Test Category ${Date.now()}`
): Promise<{ id: string; name: string }> {
  const cat = await client.createCategory({
    name,
    description: `自動化測試建立的分類：${name}`,
    sort_order: 0,
  });
  return { id: cat.id, name: cat.name };
}

/**
 * 建立一個測試用 LLM Provider
 */
export async function seedLLMProvider(
  client: ApiClient,
  overrides: Partial<{
    name: string;
    endpoint_url: string;
    model_name: string;
    api_key: string;
    is_default: boolean;
  }> = {}
) {
  return client.createLLMProvider({
    name: overrides.name ?? `test-provider-${Date.now()}`,
    endpoint_url: overrides.endpoint_url ?? "https://api.openai.com/v1",
    model_name: overrides.model_name ?? "gpt-4o-mini",
    api_key: overrides.api_key ?? "sk-test-placeholder",
    is_default: overrides.is_default ?? false,
  });
}

/**
 * 完整測試環境清理（容錯）
 */
export async function cleanupAll(client: ApiClient): Promise<void> {
  try {
    await client.cleanupAll();
  } catch {
    // ignore
  }
}
