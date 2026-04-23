# F-022: API Keys 管理頁

## 功能描述

實作 `/settings/api-keys` 頁面，提供 API Key 的列表、建立、撤銷功能。

## 使用者故事

As a aibo 使用者, I want 透過 UI 管理 API Keys, so that 我可以為不同應用建立/撤銷 key 而不必用 curl。

## 技術選型
見 `specs/tech-survey.md` — F-021 已建立的前端基礎設施。

## 設計稿
見 `design/pages/api-keys.md`

## API Contract

- `GET /api/v1/api-keys` → 列出所有 key（不含 key 值，只有 prefix）
- `POST /api/v1/api-keys` → 建立新 key（回傳完整 key 只一次）
- `DELETE /api/v1/api-keys/:id` → 撤銷 key

## Scenarios

### Scenario 1：檢視 API Key 列表
- **WHEN** 使用者進入 `/settings/api-keys`
- **THEN** 顯示 DataTable，欄位：名稱、Key 前綴、狀態、到期日、最後使用、操作
- **AND** 狀態判斷：`!is_active` → Inactive 灰、`expires_at < now` → Expired 琥珀、其他 → Active 綠
- **AND** 最後使用若為 null 顯示「從未使用」；有值顯示相對時間
- **AND** 到期日若為 null 顯示「永不過期」

### Scenario 2：建立新 API Key
- **WHEN** 使用者點擊「建立 API Key」
- **THEN** 開啟 Dialog，表單：名稱（必填 max 50）、到期日 Select（永不 / 30 / 90 / 1年 / 自訂）
- **WHEN** 提交表單
- **THEN** POST `/api/v1/api-keys`
- **AND** 成功後關閉建立 Dialog，打開「API Key 已建立」Dialog 顯示完整 key + 複製按鈕
- **AND** 點「我已複製」關閉 Dialog，刷新列表

### Scenario 3：複製 Key
- **WHEN** 使用者在建立成功 Dialog 點擊複製按鈕
- **THEN** 使用 `navigator.clipboard.writeText(key)` 複製
- **AND** 顯示 success toast「已複製到剪貼簿」

### Scenario 4：撤銷 API Key
- **WHEN** 使用者點擊某列的「撤銷」按鈕
- **THEN** 開啟 AlertDialog 確認
- **WHEN** 確認
- **THEN** DELETE `/api/v1/api-keys/:id`
- **AND** 成功後刷新列表，顯示 success toast

### Scenario 5：最後一把 Key 保護
- **WHEN** 列表中只剩 1 筆 active 的 key
- **THEN** 該列的撤銷按鈕 disabled，hover 顯示 tooltip「不能撤銷最後一把有效的 API Key」

### Scenario 6：名稱重複
- **WHEN** 使用者嘗試建立已存在名稱的 key
- **THEN** 後端回傳 409
- **AND** 前端顯示 error toast「名稱已存在」

### Scenario 7：空狀態（Bootstrap 已完成，但所有 key 被撤銷）
- **WHEN** 列表為空但 bootstrap 已完成
- **THEN** 顯示 EmptyState + 「建立 API Key」按鈕

## 實作指引

### 需要建立的檔案

```
dev/frontend/
├── app/(dashboard)/settings/api-keys/page.tsx
├── components/forms/create-api-key-dialog.tsx
├── components/forms/show-api-key-dialog.tsx
├── lib/api/api-keys.ts                       # list/create/delete
├── lib/hooks/use-api-keys.ts                 # TanStack Query hooks
└── lib/schemas/api-key.ts                    # Zod schema
```

### 關鍵邏輯
- 使用 `useQuery(["api-keys"], ...)` 載入列表
- 使用 `useMutation` + `invalidateQueries(["api-keys"])` 處理建立/刪除
- 建立成功後的完整 key 存在 local state，DO NOT 放入 query cache

### Unit Tests
- `components/forms/create-api-key-dialog.test.tsx`
- `lib/api/api-keys.test.ts`

## 依賴
- Wave: 1
- 依賴：F-021（前端基礎）
