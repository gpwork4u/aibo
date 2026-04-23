# Sprint 4 工作日誌：AI 整合升級

## 完成日期
2026-04-23

## Sprint 目標
採用 CQ 設計概念升級 aibo：MCP Server、知識結構三角形、信心度機制。

## 技術選型（Sprint 4）
| 用途 | 選擇 | 理由 |
|------|------|------|
| MCP SDK | mark3labs/mcp-go v0.49 | 8.6k stars，社群最廣泛 |
| MCP Transport | stdio | Claude Code / Cursor 原生支援 |
| MCP 架構 | 獨立 binary + HTTP 呼叫 API | 不侵入既有 Gin 架構 |

## 完成的功能

### F-012 知識結構升級（PR #39）
- Entry 新增 summary/detail/action 欄位
- LLM 自動分類 prompt 更新：同時產生三角形結構
- 搜尋權重：summary(A) 與 title 同級
- 列表 API 回傳 summary 替代 content_preview
- 向下相容：空字串不覆蓋

### F-013 信心度機制（PR #40）
- Entry 新增 confidence/confirmations/flags_count/superseded_by
- entry_flags table
- POST /entries/:id/confirm → confidence +0.1
- POST /entries/:id/flag → confidence -0.15
- GET /entries/:id/flags → flag 記錄列表
- 搜尋排序 = ts_rank × confidence

### F-011 MCP Server（PR #41）
- 獨立 binary aibo-mcp（stdio transport）
- 5 個 MCP Tools：query/propose/confirm/flag/status
- HTTP Client 封裝 aibo REST API
- Formatter：LLM 友好格式（summary/detail/action）
- GET /api/v1/stats 新增端點
- Claude Code / Cursor 設定範例
- Unit tests（client/formatter/tools）

### QA E2E Tests（PR #38）
- 36 個測試案例（F-012: 10 + F-013: 18 + F-011: 8）

## PRs 摘要
| PR | 標題 | 狀態 |
|----|------|------|
| #38 | Sprint 4 E2E Tests | 已合併 |
| #39 | F-012: 知識結構升級 | 已合併 |
| #40 | F-013: 信心度機制 | 已合併 |
| #41 | F-011: MCP Server | 已合併 |

## 統計
- Features: 3（F-011, F-012, F-013）
- PRs: 4
- Code Review 修復: 4 項
- E2E Scenarios: 36 個
- 新增依賴: mark3labs/mcp-go
