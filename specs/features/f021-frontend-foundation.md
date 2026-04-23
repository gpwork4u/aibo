# F-021: 前端專案初始化 + Layout + 共用元件

## 功能描述

建立 aibo 管理介面的前端專案基礎設施：Next.js 14 App Router + Tailwind v4 + shadcn/ui，並完成 Dashboard layout、共用元件（PageHeader、DataTable wrapper、TagInput、MarkdownViewer、EmptyState、ErrorState）、API client 封裝（含 X-API-Key 注入）、TanStack Query 整合、Bootstrap 頁面。

## 使用者故事

As a aibo 使用者, I want 一個美觀易用的 Web 管理介面, so that 我可以透過瀏覽器管理知識庫而不必只用 API。

## 目標

- 在 `dev/frontend/` 建立 Next.js 14 (App Router) 專案
- 安裝 shadcn/ui + Tailwind CSS v4 + 需要的 Radix primitives
- 完成 Dashboard layout（Sidebar + Header + Main）
- API client 封裝（`lib/api/`），支援 X-API-Key header 自動注入
- QueryClientProvider + Toaster 全域設定
- Bootstrap 流程頁面（首次進入，無 API Key 時）
- 共用元件：PageHeader、DataTable、TagInput、MarkdownViewer、EmptyState、ErrorState、SearchInput
- Dockerfile + 加入 docker-compose.yml（frontend service）

## 技術選型

見 `specs/tech-survey.md`：
- §6 UI 元件庫 — shadcn/ui + Tailwind CSS v4
- §37 TanStack Query v5
- §38 React Hook Form + Zod
- §39 react-markdown + remark-gfm + rehype-highlight
- §40 前端專案結構
- §41 新增依賴清單

## API Contract（本 feature 使用）

- `GET /api/v1/bootstrap/status` → 回傳是否已有 API Key
- `POST /api/v1/bootstrap` → 無認證建立第一把 API Key（只在系統無任何 key 時可用）

## Scenarios

### Scenario 1：首次進入（無 API Key）
- **WHEN** 使用者開啟 `http://localhost:3000/`，localStorage 無 `aibo_api_key`
- **AND** GET `/api/v1/bootstrap/status` 回傳 `{ bootstrapped: false }`
- **THEN** 導向 `/bootstrap` 頁面
- **AND** 頁面顯示歡迎訊息 + 「建立第一把 API Key」按鈕
- **AND** 使用者填寫「名稱」→ POST `/api/v1/bootstrap`
- **AND** 取得的 key 儲存到 localStorage `aibo_api_key`
- **AND** 顯示「API Key 已建立」Dialog 提醒複製（可選）
- **AND** 點「繼續」後導向 `/inbox`

### Scenario 2：已有 API Key
- **WHEN** 使用者開啟 `/`，localStorage 已有 `aibo_api_key`
- **THEN** 導向 `/inbox`

### Scenario 3：API Key 無效
- **WHEN** 任何 API 呼叫回傳 401
- **THEN** 清除 localStorage 的 key
- **AND** 導向 `/bootstrap` 並顯示錯誤 Toast「API Key 無效，請重新設定」

### Scenario 4：Dashboard Layout 顯示
- **WHEN** 使用者進入 `/inbox`（或任何 dashboard 頁面）
- **THEN** 顯示固定 Sidebar（左側 256px）+ Header（高 56px）+ Main Content
- **AND** Sidebar 列出：Inbox、知識條目、分類、搜尋、設定（API Key、LLM Provider）
- **AND** 當前頁面項目 highlighted
- **AND** Sidebar 在 mobile < 768px 時 collapse 為 overlay

### Scenario 5：API client 自動注入 X-API-Key
- **WHEN** 前端呼叫任何 `/api/v1/*` endpoint
- **THEN** 自動在 request header 加入 `X-API-Key: {localStorage.aibo_api_key}`
- **AND** 若回傳 401 → 執行 Scenario 3

### Scenario 6：Sidebar Badge 顯示 Inbox 數量
- **WHEN** 使用者在任何頁面
- **THEN** Sidebar 的「Inbox」項目旁顯示未分類條目數量
- **AND** 為 0 時不顯示 badge

### Scenario 7：Toast 通知
- **WHEN** 任何 mutation 成功/失敗
- **THEN** 右下角顯示 Sonner toast
- **AND** success 綠色 / error 紅色，3 秒後自動消失

## 實作指引

### 需要建立的檔案（`dev/frontend/` 下）

```
dev/frontend/
├── app/
│   ├── layout.tsx                      # Root + Providers
│   ├── page.tsx                        # redirect 邏輯
│   ├── bootstrap/page.tsx              # Bootstrap 頁面
│   └── (dashboard)/
│       └── layout.tsx                  # Sidebar + Header
├── components/
│   ├── ui/                             # shadcn/ui init 產生
│   ├── app-sidebar.tsx
│   ├── page-header.tsx
│   ├── data-table.tsx                  # 封裝 TanStack Table
│   ├── tag-input.tsx
│   ├── markdown-viewer.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── page-skeleton.tsx
│   └── search-input.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                   # fetch wrapper + X-API-Key
│   │   └── bootstrap.ts
│   ├── hooks/
│   │   └── use-api-key.ts
│   ├── providers.tsx                   # QueryClientProvider
│   └── utils.ts                        # cn helper
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json                     # shadcn/ui config
├── package.json
├── Dockerfile
└── .eslintrc.json
```

### 關鍵邏輯

1. **API client (`lib/api/client.ts`)**：
   - 讀取 localStorage.aibo_api_key
   - 自動 inject header `X-API-Key`
   - 401 handler → 清除 key + redirect /bootstrap
   - baseURL 從 `NEXT_PUBLIC_API_URL` 環境變數讀取（default `http://localhost:8080`）

2. **Providers (`lib/providers.tsx`)**：
   - `"use client"` component 包裹 QueryClientProvider
   - 預設 staleTime 30s、refetchOnWindowFocus false

3. **Sidebar Navigation** — 使用 shadcn/ui `<Sidebar>` (new)；項目含 icon + label + badge

4. **Tailwind v4 設定**：使用 `@import "tailwindcss"` + CSS variables 設定 tokens（colors、typography、spacing 參考 `design/tokens/`）

5. **Dockerfile**：multi-stage build，使用 `output: "standalone"` 減少映像體積

### Unit Tests（`dev/frontend/__tests__/`）
- `lib/api/client.test.ts` — X-API-Key 注入、401 處理
- `components/data-table.test.tsx` — render、sort、pagination
- `components/tag-input.test.tsx` — 新增/刪除 tag

### docker-compose.yml 更新
新增 `frontend` service（參考 tech-survey §7）

## 依賴
- Wave: 0（先行）
- 依賴：後端 API（已完成）
- 被依賴：F-022 / F-023 / F-024 / F-025（所有其他前端 feature）
