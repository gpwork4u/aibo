# aibo - 個人知識庫 API 服務

## 專案概述

- **目標**：快速整理知識 + LLM 自動分類 + 智慧搜尋，提供 API 給外部 LLM app 使用
- **目標使用者**：開發者個人使用
- **核心價值主張**：透過 LLM 自動分類與同義關鍵字搜尋，大幅降低知識整理成本

## 技術架構

| 層級 | 技術選型 | 備註 |
|------|---------|------|
| 前端 | Next.js (React) | 管理介面 |
| 後端 | Golang + Gin | API 服務 |
| 資料庫 | PostgreSQL | Docker Compose 部署 |
| 搜尋 | PostgreSQL 全文搜尋 | simple config + pg_trgm |
| LLM | 多 provider（OpenAI-compatible） | LM Studio + 第三方 |
| 認證 | API Key（SHA-256 hash） | Bootstrap 機制 |

### LLM 架構

- 支援多個 LLM provider，統一使用 OpenAI-compatible API 格式
- 一個 default provider + 手動 override
- Provider 選擇優先序：default active > 任意 active > 503 Service Unavailable
- API Key 以 AES-256 加密儲存

### 搜尋架構

- LLM 同義關鍵字展開 → PostgreSQL tsvector + pg_trgm
- 搜尋權重：title(A) = tags(A) > content(B)
- LLM 失敗時自動降級為原始 query 搜尋

### 部署架構

- Docker Compose：PostgreSQL + Golang API + Next.js 前端
- 個人單機部署

## 功能需求索引

| 編號 | 名稱 | Sprint | 優先級 | Spec 檔案 |
|------|------|--------|--------|-----------|
| F-001 | 知識條目 CRUD | Sprint 1 | P0 | `specs/features/f001-entry-crud.md` |
| F-002 | Inbox 暫存區 | Sprint 1 | P0 | `specs/features/f002-inbox.md` |
| F-003 | LLM 自動分類 | Sprint 2 | P0 | `specs/features/f003-llm-classification.md` |
| F-004 | 分類管理 | Sprint 1 | P1 | `specs/features/f004-category-management.md` |
| F-005 | LLM 同義關鍵字搜尋 | Sprint 2 | P0 | `specs/features/f005-smart-search.md` |
| F-007 | LLM Provider 管理 | Sprint 1 | P0 | `specs/features/f007-llm-provider.md` |
| F-008 | Git 整合 | Sprint 3 | P2 | `specs/features/f008-git-import.md` |
| F-009 | Google Calendar 整合 | Sprint 3 | P2 | `specs/features/f009-gcal-import.md` |
| F-010 | API Key 認證 | Sprint 1 | P0 | `specs/features/f010-api-key-auth.md` |
| F-011 | MCP Server 模式 | Sprint 4 | P0 | `specs/features/f011-mcp-server.md` |
| F-012 | 知識結構升級 | Sprint 4 | P0 | `specs/features/f012-knowledge-structure.md` |
| F-013 | 信心度機制 | Sprint 4 | P0 | `specs/features/f013-confidence.md` |
| F-014 | Tags 分層 + 多維度搜尋 | Sprint 5 | P0 | `specs/features/f014-tags-hierarchy.md` |
| F-015 | 知識生命週期 | Sprint 5 | P0 | `specs/features/f015-knowledge-lifecycle.md` |
| F-016 | 中文分詞優化 | Sprint 5 | P0 | `specs/features/f016-chinese-tokenizer.md` |
| F-017 | LLM Client 連線池 | Sprint 6 | P0 | `specs/features/f017-llm-connection-pool.md` |
| F-018 | Service Interface 化 | Sprint 6 | P0 | `specs/features/f018-service-interfaces.md` |
| F-019 | 品質檢測（VIBE 簡化版） | Sprint 6 | P1 | `specs/features/f019-quality-check.md` |
| F-020 | 小項修復 | Sprint 6 | P1 | `specs/features/f020-misc-fixes.md` |

## Sprint 規劃

### Sprint 1：基礎建設
- F-010 API Key 認證
- F-001 知識條目 CRUD
- F-004 分類管理
- F-007 LLM Provider 管理
- F-002 Inbox 暫存區

### Sprint 2：LLM 智慧功能
- F-003 LLM 自動分類
- F-005 LLM 同義關鍵字搜尋

### Sprint 3：外部整合
- F-008 Git 整合
- F-009 Google Calendar 整合

### Sprint 4：AI 整合升級
- F-011 MCP Server 模式
- F-012 知識結構升級
- F-013 信心度機制

### Sprint 5：搜尋與品質
- F-014 Tags 分層 + 多維度搜尋
- F-015 知識生命週期
- F-016 中文分詞優化

### Sprint 6：工程品質
- F-017 LLM Client 連線池
- F-018 Service Interface 化
- F-019 品質檢測（VIBE 簡化版）
- F-020 小項修復

## 非功能需求

- 所有 API 回應使用 JSON 格式
- 時間戳一律使用 ISO 8601 格式（UTC）
- 分頁預設 per_page=20，最大 100
- API 版本前綴：/api/v1/
- 所有 /api/v1/* endpoint 需 API Key 認證（bootstrap 例外）
