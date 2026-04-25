# Sprint 10 三維度驗證報告

**Milestone**: #77 Sprint 10「專案管理」
**驗證日期**: 2026-04-25
**結論**: **PASS**（含 1 個 NICE TO HAVE）

## 交付清單

| PR | Issue | 內容 | 狀態 |
|---|---|---|---|
| #128 | #106 | QA-10 e2e skeleton（26 個 test.skip） | MERGED |
| #129 | #120 | F-031a 資料層 migration 015 + model + dto + repo | MERGED |
| #130 | #126 | D-10 UI 元件規格（kanban / projects / task） | MERGED |
| #131 | #121 | F-031b Project CRUD service + handler + router | MERGED |
| #132 | #122 | F-031c Task CRUD + complete + upcoming/overdue | MERGED |
| #133 | #123 | F-032a ProjectsListPage + Dialog + sidebar | MERGED |
| #134 | #124 | F-032b ProjectDetail + Kanban + List + Overview | MERGED |
| #135 | #125 | F-032c TaskSheet + RefsPicker + UpcomingTasksWidget | MERGED |

8/8 全部交付。

## 三維度結果

### Completeness（完整性）— ✅ PASS
- 8 個 feature 對齊 specs/features/{f031,f032}-*.md scenarios
- Backend 14 個 endpoints（projects 6 + tasks 8）
- Frontend 主要頁面：Projects 列表 / Project 詳情（Board/List/Overview）/ TaskSheet / UpcomingTasksWidget

### Correctness（正確性）— ✅ PASS（1 NICE TO HAVE）
- API contract / error code（PROJECT_NOT_FOUND / PROJECT_NAME_DUPLICATE / PROJECT_HAS_TASKS / TASK_NOT_FOUND / INVALID_REF_TYPE）三邊對齊
- testid 命名 spec ↔ frontend testids.ts ↔ design testids.md 對齊
- Kanban 樂觀更新 + 失敗回滾於 PR #134 R2 補齊
- ConstraintName 結構化判斷沿用至 F-031b/c

**NICE TO HAVE**：router 巢狀任務路由用 `/:id/tasks`（spec 寫 `/:project_id/tasks`）。功能等價（handler 透過 `c.Param("id")` 讀取），但建議下個 sprint 將 spec 同步為 `/:id` 或 router 改名以一致。

### Coherence（一致性）— ✅ PASS
- 沿用 Sprint 9 慣例：ConstraintName 判斷、stub repo 測試 pattern、TanStack Query invalidate 規範
- testid 集中常數 + 動態 id 用 function 形式封裝
- 元件規格 dataset 沿用 Sprint 9 README + testids + 元件 md 結構

## Code Review 統計

- 一次通過：#128 / #130(R2) / #131 / #132 / #134(R2) / #135
- 二次通過：#129（1 SHOULD FIX：`mapTaskPgErr` 移除 strings fallback）/ #133（1 MUST FIX：移除 `|| true` 吞錯誤）/ #134（1 MUST FIX：補樂觀更新 + 回滾）
- D-10（#130）首輪缺 3 元件 + 4 HTML mocks，Round 2 補齊

## 觀察 / 流程改善

1. **engineer agent 在 frontend 任務頻繁卡住**：F-032b/c 的 agent 多次在「研究現有元件」階段停滯。orchestrator 須直接收尾接手。建議：spec/issue 給 frontend agent 時附上「沿用 X 既有元件」+「使用 npx tsc --noEmit 驗證」明確指引。
2. **isolation:worktree 不總是被尊重**：F-032a / F-031c 兩個 agent 同時寫進主 worktree 撞檔，需手動拆 commit。建議：engineer agent 起手第一步必須 `cd $WORKTREE_PATH` 並 `git checkout -b` 從 origin/main，prompt 應強化此點。
3. **Wave 並行收益顯著**：8 個 PR 在單一 session 完成，但代價是 review/test agent 排隊；可考慮 Wave 之間留 gap 讓 review 收斂。

## Sprint 11 候選 follow-up

- RefsPicker 後端搜尋接線（Entry / Journal / Gcal API）
- UpcomingTasksWidget 點擊開 TaskSheet（跨頁互動）
- Kanban quick-add 改用正式 Dialog（取代 prompt() placeholder）
- 跑 QA-10 完整 e2e 測試（目前 26 個 test 為 skel）
- router `/:id/tasks` 與 spec 命名同步
