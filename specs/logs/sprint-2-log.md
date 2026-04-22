# Sprint 2 工作日誌：LLM 智慧功能

## 完成日期
2026-04-22

## Sprint 目標
為 aibo 加入 LLM 智慧功能：自動分類和同義關鍵字搜尋。

## 技術選型（Sprint 2 補充）
| 用途 | 選擇 | 理由 |
|------|------|------|
| OpenAI-compatible Client | sashabaranov/go-openai | 10.6k stars，支援自訂 BaseURL |
| Structured Output | response_format: json_object | 相容所有 OpenAI-compatible provider |
| 背景任務 | Go goroutine + channel + WaitGroup | 場景簡單，不需 job queue |
| Rate Limiting | golang.org/x/time/rate | Go 官方擴展庫，token bucket |

## 完成的功能

### F-003 LLM 自動分類（PR #23）
- 自動觸發：POST entry 後背景 goroutine 分類
- 手動觸發：POST /entries/:id/classify（202）
- 批次分類：POST /entries/classify-all（202）
- LLM prompt → JSON { category, tags, title }
- Category case-insensitive 匹配 + 自動建立
- Channel-based worker + graceful shutdown
- 失敗時 entry 保持原狀

### F-005 LLM 同義關鍵字搜尋（PR #22）
- POST /api/v1/search — 智慧搜尋（LLM 展開 + 加權全文搜尋）
- GET /api/v1/search/simple — 簡單搜尋（降級方案）
- LLM 降級：失敗自動用原始 query，degraded: true
- 搜尋權重：title(A) = tags(A) > content(B)
- ILIKE escape 防 SQL pattern injection

### QA E2E Tests（PR #21）
- 28 個測試案例（F-003: 12 + F-005: 16）

## PRs 摘要
| PR | 標題 | 狀態 |
|----|------|------|
| #21 | Sprint 2 E2E Tests | 已合併 |
| #22 | F-005: 智慧搜尋 | 已合併 |
| #23 | F-003: LLM 自動分類 | 已合併 |

## Code Review 修復
| PR | 問題 | 嚴重度 | 修復 |
|----|------|--------|------|
| #23 | GetInboxEntryIDs 翻頁靜默 break | Bug | return error |
| #23 | handler goroutine 不受 Shutdown 控制 | Bug | 統一用 Enqueue |
| #22 | 空 query 驗證不一致 | Blocker | handler 層統一 TrimSpace |
| #22 | ILIKE 特殊字元未 escape | Blocker | escapeLikePattern + ESCAPE |

## 統計
- Features: 2（F-003, F-005）
- PRs: 3
- Code Review 修復: 4 項
- E2E Scenarios: 28 個
- 新增依賴: go-openai, x/time
