# F-024: Categories + LLM Providers 管理頁

## 功能描述

實作 `/categories` 和 `/settings/llm-providers` 兩個管理頁：分類 CRUD、LLM Provider CRUD + 健康檢查 + 設為預設。

## 使用者故事

As a aibo 使用者, I want 透過 UI 管理分類和 LLM Provider 設定, so that 我不必用 API 直接操作即可配置系統。

## 設計稿
- `design/pages/categories.md`
- `design/pages/llm-providers.md`

## API Contract

### Categories
- `GET /api/v1/categories` → 列表（含 entry_count）
- `POST /api/v1/categories`
- `PUT /api/v1/categories/:id`
- `DELETE /api/v1/categories/:id`

### LLM Providers
- `GET /api/v1/llm-providers`
- `POST /api/v1/llm-providers`
- `PUT /api/v1/llm-providers/:id`
- `DELETE /api/v1/llm-providers/:id`
- `POST /api/v1/llm-providers/:id/health` → 健康檢查

## Scenarios

### Categories

#### Scenario 1：列表
- **WHEN** 使用者進入 `/categories`
- **THEN** DataTable 顯示：名稱、描述、條目數（Badge）、排序、操作
- **AND** 依 sort_order 升冪排序

#### Scenario 2：建立分類
- **WHEN** 點擊「建立分類」
- **THEN** Dialog 表單：名稱 *（max 50）、描述（max 200）、排序（number >=0, default 0）
- **WHEN** 提交 → POST → toast「分類已建立」+ 刷新

#### Scenario 3：編輯分類
- **WHEN** 點擊某列「編輯」
- **THEN** Dialog 預填現值
- **WHEN** 提交 → PUT → toast「分類已更新」

#### Scenario 4：名稱重複（case-insensitive）
- **WHEN** 建立或編輯時名稱與現有重複
- **THEN** 後端回 409，前端顯示 error toast「名稱已存在」

#### Scenario 5：刪除分類
- **WHEN** 點擊「刪除」
- **THEN** AlertDialog「刪除「{name}」後，該分類下的 {count} 筆條目將移至 Inbox」
- **WHEN** 確認 → DELETE → toast + 刷新列表

#### Scenario 6：查看分類下的條目
- **WHEN** 點擊「查看條目」
- **THEN** 導向 `/entries?category_id={id}`

#### Scenario 7：空狀態
- **WHEN** 無分類
- **THEN** EmptyState「還沒有分類」+ 建立按鈕

### LLM Providers

#### Scenario 8：列表
- **WHEN** 使用者進入 `/settings/llm-providers`
- **THEN** DataTable 顯示：名稱（+ Default badge）、Endpoint（font-mono）、Model、狀態、健康、操作
- **AND** 健康狀態初始為 unknown

#### Scenario 9：新增 Provider
- **WHEN** 點擊「新增 Provider」
- **THEN** Dialog 表單：
  - 名稱 *（max 50）
  - Endpoint URL *（max 500，URL 格式）
  - API Key（password input，max 500）
  - Model 名稱 *（max 100）
  - 設為預設 Checkbox
  - 啟用 Checkbox（default true）
  - 進階設定（Collapsible）：Temperature（default 0.7）、Max Tokens（default 1000）、Timeout（default 30）
- **WHEN** 提交 → POST → toast + 刷新

#### Scenario 10：編輯 Provider
- **WHEN** 點擊「編輯」
- **THEN** Dialog 預填（API Key 欄位顯示「已設定」/「未設定」+ 「更新 API Key」按鈕）
- **AND** 提交時若 API Key 未改，不送該欄位；若改則送新值

#### Scenario 11：設為預設
- **WHEN** 非 default provider 的操作 menu 點擊「設為預設」
- **THEN** PUT with `is_default: true`
- **AND** 其他 provider 的 default 自動取消（後端處理）
- **AND** 刷新 + toast「已設為預設 Provider」

#### Scenario 12：健康檢查
- **WHEN** 點擊「健康檢查」
- **THEN** HealthStatus 變為 loading spinner
- **AND** POST `/:id/health`
- **AND** 成功 → HealthStatus 變 healthy（綠 ✓） + toast「連線正常（回應時間 {N}ms）」
- **AND** 失敗 → HealthStatus 變 unhealthy（紅 ✗） + error toast「連線失敗（{error}）」

#### Scenario 13：刪除 Provider
- **WHEN** 點擊「刪除」
- **THEN** AlertDialog；若是 default，額外顯示警告「這是目前的預設 Provider，刪除後將沒有預設 Provider」
- **WHEN** 確認 → DELETE → toast + 刷新

#### Scenario 14：URL 格式驗證
- **WHEN** Endpoint URL 不是有效 URL
- **THEN** Zod 驗證失敗，欄位顯示錯誤訊息「Endpoint URL 格式不正確」

## 實作指引

### 需要建立的檔案

```
dev/frontend/
├── app/(dashboard)/
│   ├── categories/page.tsx
│   └── settings/llm-providers/page.tsx
├── components/
│   ├── forms/
│   │   ├── category-form-dialog.tsx
│   │   └── llm-provider-form-dialog.tsx
│   └── health-status.tsx
├── lib/
│   ├── api/categories.ts
│   ├── api/llm-providers.ts
│   ├── hooks/use-categories.ts
│   ├── hooks/use-llm-providers.ts
│   └── schemas/
│       ├── category.ts
│       └── llm-provider.ts
```

### 關鍵邏輯
- 健康檢查：使用 local state 管理 loading，回應後更新 local cache（或 invalidate）
- API Key 編輯：表單 default 使用 undefined，若欄位被修改才送出
- 分類刪除後要 invalidate `["entries"]` 和 `["inbox-count"]`（條目會被移回 Inbox）

### Unit Tests
- `components/forms/llm-provider-form-dialog.test.tsx` — URL 驗證、進階設定展開
- `components/health-status.test.tsx`

## 依賴
- Wave: 1
- 依賴：F-021（前端基礎）
