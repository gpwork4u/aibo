# F-033 — 測試基礎設施修復 + Sprint 10 polish

**Sprint**：11
**Milestone**：[#11](https://github.com/gpwork4u/2026-01-aibo/milestone/11)
**Goal**：完成 Sprint 10 release 阻擋項目 — 修 testid 三邊對齊、解 sprint 8/9/10 e2e、產出 ALL PASSED test reports，並順手清理 4 個 verify-sprint-10 列出的 NICE TO HAVE。

## 背景

Sprint 10 完成 8 個 feature PR 後，`/specflow:release` 阻擋於：
- ❌ Test Report 缺 ALL PASSED（sprint 8/9/10 三批 e2e 都未跑通）
- ✅ Bug #94（已 PR #136 修復）
- ✅ e2e auth onboarding（已 PR #139 修復）

## 子功能

### F-033a — testid 三邊對齊
**問題**：`test/browser/fixtures/projects.ts` 的 testid 命名與 `dev/frontend/lib/projects/testids.ts` 不一致（fixture 用 `projects-list-card-${id}`，frontend 用 `project-card-${id}`），導致 sprint 10 e2e 解 skip 後也選不到元素。

**範圍**：
- 以 `design/components/projects/testids.md` 為 source of truth
- 同步 `dev/frontend/lib/projects/testids.ts`
- 同步 `test/browser/fixtures/projects.ts`
- 同樣檢查 sprint 8/9 fixture（calendar / journal / gcal）有沒有類似不一致

**WHEN/THEN**
- WHEN 跑 `grep PROJECTS_TESTIDS dev/frontend/lib test/browser/fixtures` THEN 兩邊常數鍵與值完全相同
- WHEN 跑 sprint 10 任一 e2e（即使仍有 skip）THEN 至少 testid 名稱不會 typo

### F-033b — 解 sprint 10 e2e + 跑綠
**範圍**：26 個 sprint 10 e2e（projects-list、list-view、detail-overview、kanban、task-sheet、upcoming-tasks）。

**WHEN/THEN**
- WHEN 移除 `test.skip(true, ...)` 並跑 `npx playwright test` THEN 全 26 個綠
- 失敗的開 bug issue 修，附截圖
- 跑通後產出 `test/reports/sprint-10-test-report.md` 標 **ALL PASSED**

### F-033c — 解 sprint 8 / 9 e2e + 跑綠
**範圍**：sprint 8（calendar 系列）+ sprint 9（journal / gcal 系列）的 e2e 也要全綠。

**WHEN/THEN**
- WHEN 跑 `npx playwright test` 全部（不限 sprint 10）THEN 全綠
- 產出 `test/reports/sprint-8-test-report.md` 與 `test/reports/sprint-9-test-report.md` 標 ALL PASSED

### F-033d — Sprint 10 NICE TO HAVE
四個 verify-sprint-10 提到的 polish：

1. **RefsPicker 後端搜尋接線**
   - WHEN 在 RefsPicker 切到 entry tab 並搜尋 THEN 呼叫 `GET /api/v1/entries?q=` 顯示結果
   - 同樣 journal / gcal_event tab
2. **UpcomingTasksWidget 點擊跨頁開 TaskSheet**
   - WHEN 點 widget 內 task THEN 跳到 `/projects/:id?task=:id` 並自動開 sheet
3. **Kanban quick-add 改正式 Dialog**
   - WHEN 點欄位 + 按鈕 THEN 開 Dialog（含 priority / due_date 預填），取代 `window.prompt()`
4. **router `/:id/tasks` 與 spec 命名同步**
   - 命名選擇：保留 `:id`，**改 spec 而非改 router**（避免 frontend / fixture 同步成本）
   - WHEN 對照 specs/features/f031-projects-tasks.md THEN 任務子路徑寫 `:id`

## 實作策略

```
Wave 0：F-033a testid 對齊（其餘工作的前置）
Wave 1：F-033b sprint 10 e2e + F-033d NICE TO HAVE 並行
Wave 2：F-033c sprint 8/9 e2e（在 10 跑通並穩定後再做）
```

## 完成標準

- [ ] testid 三邊對齊驗證腳本通過
- [ ] `test/reports/sprint-{8,9,10}-test-report.md` 三份全標 ALL PASSED
- [ ] 4 個 NICE TO HAVE 全 merged
- [ ] `gh pr list --state open` = 0
- [ ] `gh issue list --label bug --state open` = 0
- [ ] `/specflow:release` gate 五項全綠
