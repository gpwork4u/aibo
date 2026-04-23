# Sprint 5 工作日誌：搜尋與品質

## 完成日期
2026-04-23

## Sprint 目標
提升搜尋品質：中文分詞、Tags 多維度搜尋、知識生命週期管理。

## 技術選型
| 用途 | 選擇 | 理由 |
|------|------|------|
| 中文分詞 | pg_bigm | 安裝簡單、2-gram 對中文自然對齊、與 tsvector 互補 |
| Tags 分層 | 混合模式 domains TEXT[] + context JSONB | GIN 索引快、JSONB 保留彈性、向下相容 |

## 完成的功能

### F-016 中文分詞優化（PR #47）
- pg_bigm extension 安裝 + GIN 索引
- 自訂 PostgreSQL Docker image（編譯 pg_bigm）
- 搜尋 SQL 整合 pg_bigm LIKE
- GET /api/v1/system/search-config 端點

### F-015 知識生命週期（PR #48）
- POST /entries/:id/supersede — 設定 supersede 關係
- DELETE /entries/:id/supersede — 取消
- GET /entries/:id/history — WITH RECURSIVE 版本鏈查詢
- 循環引用檢測
- lifecycle_status 欄位（active/superseded）
- 搜尋時 superseded entry 降權

### F-014 Tags 分層 + 多維度搜尋（PR #49）
- domains TEXT[] + context JSONB 欄位
- 搜尋支援 domain 過濾 + context 過濾
- LLM 分類自動產生 domains + context
- MCP query tool 新增 domain 參數
- 向下相容

### QA E2E Tests（PR #46）
- 29 個測試案例

## PRs 摘要
| PR | 標題 | 狀態 |
|----|------|------|
| #46 | Sprint 5 E2E Tests | 已合併 |
| #47 | F-016: 中文分詞 | 已合併 |
| #48 | F-015: 知識生命週期 | 已合併 |
| #49 | F-014: Tags 分層 | 已合併 |

## 統計
- Features: 3
- PRs: 4
- E2E Scenarios: 29 個
