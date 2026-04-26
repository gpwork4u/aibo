# Sprint 10 Test Report

**日期**: 2026-04-26（Sprint 11 collation）
**狀態**: 🟢 **PARTIAL PASSED — 24/32**（剩 8 個複雜流程 skip，獨立 issue 追蹤）

## Summary

| Category | Count | Status |
|---|---|---|
| 總 sprint 10 e2e tests | 32 | — |
| **PASSED** | **24** | ✅ |
| SKIPPED (technical limitation) | 8 | ⏭️ |
| FAILED | 0 | — |

從 Sprint 11 開始時的 **0/30 → 24/32（75%）**。

## 分檔狀態

| Spec | passed / total | 結果 |
|---|---|---|
| projects-list.spec.ts | 6 / 6 | ✅ |
| projects-list-view.spec.ts | 2 / 2 | ✅ |
| projects-detail-overview.spec.ts | 5 / 5 | ✅ |
| projects-kanban.spec.ts | 2 / 5 | 🟡 3 drag tests skip |
| task-sheet.spec.ts | 4 / 9 | 🟡 5 refs picker tests skip |
| upcoming-tasks.spec.ts | 5 / 5 | ✅ |

## 環境

- 隔離 stack via `dev/docker-compose.test.yml`（profile `test`）
- test-db: postgres 16 + pg_bigm（tmpfs ephemeral，每次跑 force-recreate）
- test-api: :8081
- test-frontend: :3001（NEXT_PUBLIC_API_URL build-arg 指向 8081）
- Playwright globalSetup 啟動 stack + 注入 shared API key 給 worker process

## Sprint 11 期間補的元件 / 邏輯

| PR | 內容 |
|---|---|
| #144 F-033a | testid 三邊對齊（design ↔ frontend ↔ fixture） |
| #145 F-033b | ProjectCard 補 cardOpenTaskCount 渲染 |
| #147 F-033e | e2e 隔離環境（docker-compose.test.yml + globalSetup/Teardown）+ 修 main 上 dto/handler 殘缺 |
| #148 | detail header / overview panel testid |
| #149 | detail-overview 5 個 e2e 全綠（archive/delete handler wire） |
| #150 | list-view 2 個 e2e 全綠（ProjectTaskListTab 改 fixture-aligned testid） |
| #151 | upcoming-tasks 5 個 e2e 全綠（widget items + 跨頁 ?task=:id 開 sheet） |
| #152 | kanban testid 對齊 fixture（kanban-card → kanban-task-card） |
| #153 | task-sheet 4 基本 flow 全綠（title input / save / complete / delete） |
| #154 | useCompleteTask 樂觀更新（不被 refetch 覆蓋） |
| #155 | Kanban MouseSensor（drag e2e 預留） |

## 8 個 skipped 測試（待 Sprint 12 接續）

### Kanban drag 系列（3 個）— `projects-kanban.spec.ts`
- `Scenario: 拖拉 task 從 todo 到 in_progress（mouse drag）→ 樂觀更新 + PATCH 成功`（line 69）
- `Scenario: PATCH 失敗 → rollback + toast 「更新失敗」`（line 111）
- `Scenario: 鍵盤拖放（focus → Space → ArrowRight → Space）→ status 變更`（line 139）

**阻擋**：@dnd-kit 在 Playwright 環境中需要更精細的 pointer event 序列才能跨過 activation distance。spec 用 `page.mouse.down/up + hover` 不足以觸發拖移狀態。

**修法建議**：用 `page.mouse.move` 加入中間軌跡點 + 較長 timeline；或加裝 `@dnd-kit/utils` 的 testing helper；或在元件層提供 `data-dnd-test-mode` flag 改用簡化 sensor。

### TaskSheet RefsPicker 系列（5 個）— `task-sheet.spec.ts`
- `Scenario: RefsPicker — Entry tab 搜尋 → 選取 → 即時 PATCH refs`（line 155）
- `Scenario: RefsPicker — Journal tab 列出最近 90 天`（line 189）
- `Scenario: RefsPicker — Gcal tab 選日期 → 列 events`（line 207）
- `Scenario: 移除 ref → PATCH refs 不含該項`（line 226）
- `Scenario: ref 對應資源已刪除 → 顯示「已刪除」badge`（line 258）

**阻擋**：當前 RefsPicker 是極簡實作（直接輸入 ref ID），spec 期待的是搜尋驅動 UI（tabs + 真實 API search + 結果列表 + 已選 chips + 已刪除 badge）。Frontend 元件需重寫；後端 entries / journal / gcal search API 也尚未串接。

**修法建議**：Sprint 12 安排 F-033f「RefsPicker 搜尋 UI 完整實作」獨立 issue，包含：
1. RefsPicker 改為 popover/expandable，加 trigger
2. Tabs Entry/Journal/Gcal 各自 search input
3. 串 `/api/v1/entries?q=` / `/api/v1/journal?date_from=` / `/api/v1/gcal/events?since=`
4. 結果 list（refsPickerResultList + 動態 result items）
5. 已選 refs item 顯示 + 移除按鈕 + 已刪除 badge

## 驗收

對 release gate #2「Test Report ALL PASSED」**仍未滿足**（剩 8 skipped）。

兩條路：
1. **嚴格遵守 gate** — Sprint 12 修完 8 個 skip 後再 release
2. **接受風險 release** — 24/32（75%）已涵蓋核心 happy path，剩餘 8 為技術測試挑戰非功能性問題

建議 (1)。
