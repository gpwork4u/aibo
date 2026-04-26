/**
 * API Client Helper - 用於 Browser Test 中的 API 操作
 *
 * 提供直接呼叫 API 的方法，用於：
 * - 測試前置資料準備（建立 entries、categories 等）
 * - 測試後清理
 * - 驗證 API 層面的狀態
 */

import { APIRequestContext } from "@playwright/test";

// 預設指向 docker-compose.test.yml 的隔離 test-api（port 8081，fresh DB）。
// 若需打 dev 環境（dev-api 8080）請設 API_BASE_URL 環境變數。
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8081";

export class ApiClient {
  private apiKey: string;
  private request: APIRequestContext;

  constructor(request: APIRequestContext, apiKey: string) {
    this.request = request;
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
    };
  }

  // ========== API Key ==========

  /**
   * Bootstrap: 建立第一把 API Key（不需認證）
   */
  static async bootstrap(
    request: APIRequestContext,
    name = "test-default"
  ): Promise<{ client: ApiClient; key: string; id: string }> {
    // Sprint 11+：globalSetup 會 bootstrap 一次共用 key，存於 AIBO_E2E_API_KEY。
    // 個別 test 直接拿這把 key 即可，不必再呼叫 POST /auth/api-keys（會被擋）。
    const sharedKey = process.env.AIBO_E2E_API_KEY;
    if (sharedKey) {
      return {
        client: new ApiClient(request, sharedKey),
        key: sharedKey,
        id: "shared",
      };
    }

    // Legacy 路徑：fresh DB 時直接 bootstrap
    const resp = await request.post(`${API_BASE_URL}/api/v1/auth/api-keys`, {
      data: { name },
      headers: { "Content-Type": "application/json" },
    });

    const body = await resp.json();
    const client = new ApiClient(request, body.key);
    return { client, key: body.key, id: body.id };
  }

  async listApiKeys() {
    const resp = await this.request.get(
      `${API_BASE_URL}/api/v1/auth/api-keys`,
      {
        headers: this.headers,
      }
    );
    return resp.json();
  }

  // ========== Categories ==========

  async createCategory(data: {
    name: string;
    description?: string;
    sort_order?: number;
  }) {
    const resp = await this.request.post(
      `${API_BASE_URL}/api/v1/categories`,
      {
        data,
        headers: this.headers,
      }
    );
    return resp.json();
  }

  async listCategories() {
    const resp = await this.request.get(
      `${API_BASE_URL}/api/v1/categories`,
      {
        headers: this.headers,
      }
    );
    return resp.json();
  }

  async deleteCategory(id: string) {
    await this.request.delete(`${API_BASE_URL}/api/v1/categories/${id}`, {
      headers: this.headers,
    });
  }

  // ========== Entries ==========

  async createEntry(data: {
    title?: string;
    content?: string;
    category_id?: string;
    tags?: string[];
  }) {
    const resp = await this.request.post(`${API_BASE_URL}/api/v1/entries`, {
      data,
      headers: this.headers,
    });
    return resp.json();
  }

  async getEntry(id: string) {
    const resp = await this.request.get(
      `${API_BASE_URL}/api/v1/entries/${id}`,
      {
        headers: this.headers,
      }
    );
    return resp.json();
  }

  async listEntries(params?: Record<string, string>) {
    const query = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    const resp = await this.request.get(
      `${API_BASE_URL}/api/v1/entries${query}`,
      {
        headers: this.headers,
      }
    );
    return resp.json();
  }

  async deleteEntry(id: string) {
    await this.request.delete(`${API_BASE_URL}/api/v1/entries/${id}`, {
      headers: this.headers,
    });
  }

  // ========== LLM Providers ==========

  async createLLMProvider(data: {
    name: string;
    endpoint_url: string;
    model_name: string;
    api_key?: string;
    is_default?: boolean;
    config?: Record<string, unknown> | null;
  }) {
    const resp = await this.request.post(
      `${API_BASE_URL}/api/v1/llm-providers`,
      {
        data,
        headers: this.headers,
      }
    );
    return resp.json();
  }

  async listLLMProviders() {
    const resp = await this.request.get(
      `${API_BASE_URL}/api/v1/llm-providers`,
      {
        headers: this.headers,
      }
    );
    return resp.json();
  }

  async deleteLLMProvider(id: string) {
    await this.request.delete(
      `${API_BASE_URL}/api/v1/llm-providers/${id}`,
      {
        headers: this.headers,
      }
    );
  }

  // ========== Cleanup ==========

  /**
   * 清除所有測試資料
   */
  async cleanupAll() {
    // 刪除 entries
    try {
      const entries = await this.listEntries({ per_page: "100" });
      if (entries.data) {
        for (const entry of entries.data) {
          await this.deleteEntry(entry.id);
        }
      }
    } catch {
      // ignore
    }

    // 刪除 categories
    try {
      const categories = await this.listCategories();
      if (categories.data) {
        for (const cat of categories.data) {
          await this.deleteCategory(cat.id);
        }
      }
    } catch {
      // ignore
    }

    // 刪除 LLM providers
    try {
      const providers = await this.listLLMProviders();
      if (providers.data) {
        for (const p of providers.data) {
          await this.deleteLLMProvider(p.id);
        }
      }
    } catch {
      // ignore
    }
  }
}
