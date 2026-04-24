# Sprint 7 工作日誌：前端實作

## 完成日期
2026-04-24

## Sprint 目標
實作 Next.js 管理介面，涵蓋所有後端 API 的 UI。

## 技術選型
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS v3 + shadcn/ui
- TanStack Query v5
- react-hook-form + zod
- react-markdown + remark-gfm + rehype-highlight
- lucide-react icons

## 完成的功能

### F-021 前端基礎（PR #67）
- Next.js 14 App Router 專案初始化
- shadcn/ui 元件（button, input, dialog, dropdown, table 等）
- Layout（Sidebar + Header + Mobile overlay）
- QueryProvider + ThemeProvider + Dark mode
- Bootstrap 頁面（首次設定 API Key）
- 共用元件：AppSidebar, AppHeader, PageHeader, EmptyState, ErrorState, SearchInput, TagInput, MarkdownViewer, DataTable
- API Client（自動注入 X-API-Key + 401 處理）
- Dockerfile + docker-compose 整合

### F-022 API Keys 管理頁（PR #69）
- 列表 + 建立/撤銷 dialog
- Key 明文一次性顯示 + 複製功能
- 最後一把 key 保護

### F-023 Entries + Inbox 頁面（PR #69）
- 列表（分頁 + 過濾 + 搜尋）
- 詳情頁（Markdown 渲染）
- 建立/編輯/刪除
- confirm/flag 按鈕
- Inbox 視圖（未分類過濾）
- 移動至分類 popover

### F-024 Categories + LLM Providers 管理頁（PR #69）
- Categories CRUD 表格
- LLM Providers CRUD + 健康檢查
- 表單驗證（react-hook-form + zod）

### F-025 搜尋頁（PR #68）
- 智慧/簡單搜尋切換
- URL query param 同步
- 500ms debounce
- matched_keywords 高亮
- Confidence indicator
- Degraded 模式提示

### QA Browser Tests（PR #66）
- 5 個測試檔案 + helpers
- data-testid 對照表給 engineer 參考

## PRs 摘要
| PR | 標題 | 狀態 |
|----|------|------|
| #66 | Sprint 7 Browser Tests | 已合併 |
| #67 | F-021: 前端基礎 | 已合併 |
| #68 | F-025: 搜尋頁 | 已合併 |
| #69 | F-022/F-023/F-024: 前端管理頁面（合併 PR） | 已合併 |

## 備註
原本 F-022/023/024 分別開三個分支並行開發，但 agent 碰到 API 限制中斷。
三個 agent 的工作混在同一 working tree，故合併為 PR #69 一次交付。

## 統計
- Features: 5（F-021~F-025）
- PRs: 4（F-022/023/024 合併）
- 前端檔案: 100+ 個
