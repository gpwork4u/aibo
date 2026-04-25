# Sprint 10 Test Report

**日期**: 2026-04-25（更新版）
**狀態**: 🟡 **PARTIAL**（auth helper 已修，e2e 解 skip + 跑綠仍待 Sprint 11 完成）

## 更新摘要（2026-04-25 後續）

- ✅ Bug #94 production build 失敗已修（PR #136 merged）
- ✅ e2e auth helper 改用 `addInitScript` 修好 onboarding redirect（PR #139 merged）
- ⏳ Sprint 10 的 26 個 e2e 仍為 `test.skip(true, ...)` 狀態，未實際跑綠
- ⏳ Sprint 8 / 9 的 e2e 也尚未產出 ALL PASSED 報告

故 release gate #2「Test Report ALL PASSED」**仍未滿足**，需要 Sprint 11 接續：
1. 逐個解 sprint 8/9/10 的 test.skip
2. 跑 Playwright 全綠
3. 修暴露的 bug
4. 產出 ALL PASSED 報告



## 環境

- Docker Compose：未跑（QA-10 sprint 著重於 spec & skel 階段，docker 環境設定未驗證）
- Frontend dev server：可起，但 e2e auth helper 流經 onboarding 流程時無法完成註冊 → 進入 dashboard 失敗
- Backend：可起（Sprint 10 PR 全 merged，含 #136 修復 production build）

## Test 範圍（QA-10 skel）

26 個 Playwright e2e（status: skip）涵蓋：
- `projects-list.spec.ts`（7 tests）— 列表 / 空狀態 / 新增 / status tabs
- `projects-list-view.spec.ts`（2 tests）— 排序 / 過濾
- `projects-detail-overview.spec.ts`（5 tests）— 詳情頁 Overview
- `projects-kanban.spec.ts`（5 tests）— Kanban 拖曳 / 樂觀更新
- `task-sheet.spec.ts`（9 tests）— TaskSheet 編輯 / 完成 / 刪除
- `upcoming-tasks.spec.ts`（5 tests）— sidebar widget

## 阻擋根因

QA agent 啟動 Playwright 後發現所有 test 都卡在 onboarding 頁面：
- `test/browser/helpers/auth.ts` 嘗試的 fixture user 認證流程未能跨過 onboarding
- 結果：sprint 10 specific assertion 都還沒執行就失敗

## 對 release 的影響

`/specflow:release` gate 條件 #2 「Test Report ALL PASSED」**未滿足**。釋出 production 前需：

1. **修 e2e auth helper** — 讓測試帳號跨過 onboarding（建議用 backend seed user 或 storage state 跳過 UI flow）
2. **跑完 26 個 e2e 並收綠** — 不通過的記為 bug 開 issue
3. **產出新版 Test Report 標 ALL PASSED**

## 建議

開 Sprint 11「測試基礎設施修復」issue，含：
- 修 `test/browser/helpers/auth.ts` 的 onboarding 路徑
- 補 `test/browser/fixtures/projects.ts` 的 seed 機制
- 跑完 sprint 8 / 9 / 10 三批 e2e 全綠後再 release

或：使用者明確接受「以 unit + integration tests + 手動 smoke 替代 e2e gate」的風險再 release。

## QA agent 投資的內容（已 stash 暫存）

QA agent 修改了 7 份 test spec（部分 unskip），由於 auth 失敗無法驗證正確性，stash 在 `wip-qa10-investigation` 暫存。Sprint 11 修 auth 後可恢復繼續。
