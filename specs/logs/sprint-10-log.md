# Sprint 10 工作日誌 — 專案管理

**Milestone**：#77
**起迄**：2026-04-25
**目標**：交付專案管理（Projects + Tasks 後端 + Kanban / List / Overview / TaskSheet 前端）。

## 交付

| Feature | Issue | PR | 說明 |
|---|---|---|---|
| QA-10 (skel) | #106 | #128 | 26 個 Playwright test skeleton |
| F-031a | #120 | #129 | migration 015 + model + dto + repository |
| D-10 | #126 | #130 | UI 元件規格 + tokens + HTML mocks |
| F-031b | #121 | #131 | Project CRUD + archive + force delete |
| F-031c | #122 | #132 | Task CRUD + complete + upcoming/overdue + RecomputeProgress |
| F-032a | #123 | #133 | ProjectsListPage + ProjectDialog + sidebar |
| F-032b | #124 | #134 | ProjectDetailPage + KanbanBoard (@dnd-kit) + List + Overview |
| F-032c | #125 | #135 | TaskSheet + RefsPicker + UpcomingTasksWidget |

## Wave 並行策略實際執行

```
Wave 0：QA-10 skel / F-031a / D-10（3 條線）
Wave 1：F-031b / F-031c (after F-031a) / F-032a (after F-031b)
Wave 2：F-032b / F-032c (after F-031c, F-032a)
```

## Code Review 統計

- 一次通過：#128 / #131 / #132 / #135
- 二次通過：#129（SHOULD FIX：mapTaskPgErr 移除 strings fallback）/ #130（缺 3 元件 + 4 HTML mocks）/ #133（MUST FIX：移除 `|| true` 吞 409 錯誤）/ #134（MUST FIX：補樂觀更新 + 失敗回滾）

## 三維度驗證

[`specs/verify-sprint-10.md`](../verify-sprint-10.md) — **PASS**

## 觀察 / 流程改善

1. **engineer agent 在 frontend 任務常卡住**：F-032b/c 多次停在「研究既有元件」階段，orchestrator 須直接接手收尾。建議在 issue body 附上「沿用 X 既有 hook / 元件路徑」明確 pointer。
2. **isolation:worktree 不總被尊重**：F-032a / F-031c agent 同時寫進主 worktree 撞檔，需手動 stash/split commit。下個 sprint 在 prompt 第一句強化「`cd $WORKTREE` + `git checkout -b ... origin/main` 不可省」。
3. **F-032b page wrapper 由 orchestrator 補**：engineer agent 寫了 1130 行核心元件後止步，page.tsx 與 ProjectTaskListTab 由 orchestrator 補完並通過 review。
4. **Wave 並行收益顯著**：單一 session 8 個 PR 全 merge，Sprint 9 也是類似節奏；但 review queue 累積會導致主視窗 context 壓力大。
5. **#134 R1 review 抓到實質 bug**：handleMove 的 optimistic update 缺失，code-review agent 確實有產出價值，補一個 1 commit fix 解決。

## 統計

- PR 總數：8
- 程式碼 lines added（估）：~3500 Go、~3700 TS、~1900 markdown / HTML
- 新檔：~35
- 修改檔：~10

## Sprint 11 候選 follow-up

- RefsPicker 後端搜尋接線（Entry / Journal / Gcal API）
- UpcomingTasksWidget 點擊跨頁開 TaskSheet
- Kanban quick-add 改正式 Dialog（替 prompt() placeholder）
- 跑 QA-10 完整 e2e（26 個 test 解 skip）
- router `/:id/tasks` 與 spec 命名同步
