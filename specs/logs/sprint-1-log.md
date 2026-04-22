# Sprint 1 工作日誌：基礎建設

## 完成日期
2026-04-22

## Sprint 目標
建立 aibo 個人知識庫 API 服務的基礎架構，包含認證、CRUD、分類管理、LLM Provider 管理。

## 技術選型（Tech Survey）
| 用途 | 選擇 | 理由 |
|------|------|------|
| 後端框架 | Gin v1.10+ | Go 生態最成熟 |
| DB Client | pgx v5 + pgxpool | 效能最佳，原生支援 TEXT[]、JSONB |
| 全文搜尋 | simple + pg_trgm | 個人知識庫夠用 |
| DB Migration | golang-migrate | 社群最活躍 |
| API Key Hash | SHA-256 + constant-time compare | 防 timing attack |
| LLM Key 加密 | AES-256-GCM | Go 標準庫原生 |
| 前端 UI | shadcn/ui + Tailwind CSS v4 | 元件原始碼可控 |
| Docker | postgres:16-alpine + multi-stage build | 輕量映像 |

## 完成的功能

### F-010 API Key 認證（PR #12）
- API Key middleware（X-API-Key header）
- Bootstrap 機制（無 key 時免認證）
- SHA-256 hash + constant-time compare
- Key 格式：aibo_ + 32 chars random
- 不能刪除最後一把有效 key

### F-004 分類管理（PR #15）
- Category CRUD（POST/GET/GET:id/PUT/DELETE）
- name 大小寫不敏感唯一
- 刪除時底下 entries 的 category_id 設 NULL
- LEFT JOIN entry_count

### F-007 LLM Provider 管理（PR #16）
- Provider CRUD + 健康檢查
- AES-256-GCM 加密 api_key
- 單一 default provider + 手動 override
- Transaction 保護 default 切換

### F-001 知識條目 CRUD（PR #17）
- 極簡建立（title 或 content 至少一個）
- 列表：分頁 + category/tag/archived 過濾 + 排序 + 全文搜尋
- 加權搜尋：title(A) = tags(A) > content(B)
- pg_trgm 支援中文模糊搜尋
- PATCH 部分更新、硬刪除

### F-002 Inbox 暫存區（PR #17）
- 複用 F-001，category_id=null 過濾
- 零額外 API

### UI Design（PR #14）
- 19 個設計檔案：4 tokens + 9 元件 + 6 頁面規格
- shadcn/ui + Tailwind CSS v4 + Lucide Icons

### QA E2E Tests（PR #13）
- 63 個 WHEN/THEN scenarios 轉為 Go test
- Playwright browser test 框架

## PRs 摘要

| PR | 標題 | 狀態 |
|----|------|------|
| #12 | F-010: API Key 認證 | 已合併 |
| #13 | Sprint 1 E2E Tests | 已合併 |
| #14 | Sprint 1 UI Components | 已合併 |
| #15 | F-004: 分類管理 | 已合併 |
| #16 | F-007: LLM Provider 管理 | 已合併 |
| #17 | F-001 + F-002: Entry CRUD + Inbox | 已合併 |

## Code Review 發現的問題與修復

| PR | 問題 | 嚴重度 | 修復 |
|----|------|--------|------|
| #15 | Merge conflict markers 遺留 | 嚴重 | 已修復 |
| #15 | 刪除時未設 category_id NULL | 嚴重 | 已修復 |
| #15 | N+1 entry_count 查詢 | 中等 | 改為 LEFT JOIN |
| #16 | Transaction race condition | 嚴重 | CreateTx/UpdateTx 同一 tx |
| #16 | ApiKeyOmit 永遠 false | 嚴重 | 修復 handler 邏輯 |
| #17 | 搜尋權重未實作 | 嚴重 | setweight + ts_rank |
| #17 | per_page 驗證不一致 | 中等 | 統一 handler 層 |
| #17 | 列表多餘欄位 | 中等 | 移除 source 欄位 |

## 統計
- Features: 5（F-010, F-004, F-007, F-001, F-002）
- PRs: 6（含 QA + UI）
- Code Review 修復: 8 項
- E2E Scenarios: 63 個
- UI 設計檔案: 19 個
