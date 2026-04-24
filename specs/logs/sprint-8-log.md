# Sprint 8 工作日誌 — 行事曆基礎

**Milestone**：#75
**起迄**：2026-04-24 → 2026-04-25
**目標**：讓使用者在單一介面看到「每天新增的知識條目 + Google Calendar 事件 + 日記 placeholder」，為 Sprint 9 日記與 Sprint 10 專案管理打底。

## 交付

| Feature | Issue | PR | 說明 |
|---|---|---|---|
| F-026a | #79 | #87 | 後端 migration 012 + Entry repo 日期區間查詢 + Calendar DTOs |
| F-026b | #80 | #90 | `GET /api/v1/calendar` + `GET /api/v1/calendar/days/:date`（`include_gcal` 三態分支、X-Degraded、X-Timezone） |
| F-026c | #81 | #89 | `POST /api/v1/calendar/events/:gcal_id/to-entry`（`pgconn.PgError.ConstraintName` 去重） |
| F-027a | #82 | #91 | `/calendar` 頁面、月視圖、toolbar、sidebar「行事曆」 |
| F-027b | #83 | #92 | 週視圖 + 日視圖 + 鍵盤快捷鍵（vim 風格） + 手機 fallback |
| F-027c | #84 | #93 | DayDetailSheet（entries/events/journal 三區） + gcal event 轉 entry |
| D-08 | #78 | #88 | 10 份元件 markdown + 4 份 page mocks + tokens |
| QA-08 (skel) | #85 | #86 | 6 支 Playwright spec 骨架（35 tests） |
| QA-08 (full) | #85 | #95 | 解除 `test.skip` 並補完 35 個 test 完整 assertion |

## Wave 並行策略實際執行

```
Wave 0 (skeleton / no backend dep)：F-026a │ D-08 │ QA-08 skel
Wave 1：F-026b │ F-026c │ F-027a
Wave 2：F-027b │ F-027c
Wave 3：QA-08 full e2e + verifier
```

## Code Review 統計

- 首輪通過：#88 D-08、#91 F-027a（部分）
- 一次修正後通過：#86 QA skel、#87 F-026a、#89 F-026c、#90 F-026b、#92 F-027b、#93 F-027c
- 最多修正輪數：2（F-026a、F-026b、F-026c、F-027b、F-027c）
- 主要 review 發現：
  - migration tiebreaker（F-026a）
  - pgconn 結構化錯誤判斷（F-026c repo 層）
  - `include_gcal` 三態分支原先未實作（F-026b handler）
  - vim 快捷鍵方向 j/k 映射錯誤（F-027b）
  - testid `sheetClose` 未傳入（F-027c）

## 三維度驗證

[`specs/verify-sprint-8.md`](../verify-sprint-8.md) — **PASS**

- Completeness ✅
- Correctness ✅
- Coherence ✅

## 技術債 / Sprint 9 改善項

1. `dev/frontend/tsconfig.tsbuildinfo` 修掉進 git 的問題
2. `test/reports/` vs `test/screenshots/` 本地 / CI gitignore 策略對齊
3. `dev/src/service/calendar.go` 的三態分支補 table-driven unit test
4. `parseIncludeGcal(c)` helper 消除 Aggregate / GetDay 重複
5. testid 三邊手動同步有漂移風險，考慮 codegen 或共享 package

## 流程改善（給 SpecFlow）

- spec-writer 產出的 spec 檔需在當 sprint 第一個 feature PR 內一併 commit（本 Sprint 初期 spec 只存在本地 untracked，至 verifier 才發現）
- engineer agent 多次在 commit/push/PR 環節卡住，orchestrator 需一開始就清楚授權完整流程，或每支 agent 完成後主動檢查 PR 是否真的開好
- 同帳號無法 self-approve PR，code-review agent 改以 PR comment + 明確 `PASS / REQUEST_CHANGES` 字樣，orchestrator 依 comment 判定是否 admin merge
