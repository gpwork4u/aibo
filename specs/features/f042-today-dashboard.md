# F-042: Today Dashboard

## Status: active
## Sprint: 14
## Priority: P0
## GitHub Issues: 待開

## 使用者故事
As a user, I want a Today page that shows my daily context at a glance — including today's journal, calendar events, tasks due today, and recent entries — so that I can start my day with full situational awareness.

## 設計決策
- Today dashboard 為聚合視圖，整合多個資料來源（不新增後端 API，使用現有 endpoints）
- 版面：垂直排列的 section cards（editorial 紙本設計）
- 日期依瀏覽器 timezone 計算（不依賴後端 timezone）
- 資料來源：journal（F-028）/ calendar（F-026）/ entries（F-001）/ projects tasks（F-031）

## UI 架構

```
/today
├── TodayPage
│   ├── TodayHeader（今日日期 + 天氣佔位 + greeting）
│   ├── JournalSection
│   │   ├── DailyJournalCard（今日日記摘要 + 快速 edit CTA）
│   │   └── 若無日記：CreateJournalCTA
│   ├── CalendarSection（若有 GCal 連線）
│   │   └── EventList（今日 events，時間軸排列）
│   ├── TasksSection
│   │   └── TaskList（due_date = today 的 tasks，按 priority 排序）
│   └── RecentEntriesSection
│       └── 今日新增/更新的 entries（最多 5 筆）
```

## API 來源（全部現有 endpoints）

| Section | API | Query Params |
|---------|-----|-------------|
| Journal | `GET /api/v1/journal/:date` | date = today（YYYY-MM-DD） |
| Calendar | `GET /api/v1/calendar/days/:date` | date = today |
| Tasks | `GET /api/v1/tasks` | due_date=today, status=pending |
| Recent Entries | `GET /api/v1/entries` | updated_since=today_start, per_page=5 |

## Business Rules
1. 今日日期以瀏覽器 `Intl.DateTimeFormat` 取得，格式 YYYY-MM-DD（Asia/Taipei）
2. 若 GCal 未連線，CalendarSection 不顯示（不報錯）
3. 若無日記，顯示 CTA 引導建立（呼叫 POST /api/v1/journal with today's date）
4. 各 section 獨立 loading / error state（單一 section 失敗不影響其他）
5. Tasks section 只顯示未完成任務（status != done）
6. RecentEntries 顯示今日 00:00 之後 created_at 或 updated_at 的 entries

## Scenarios

### Happy Path

#### Scenario: 載入 Today 完整頁面
GIVEN 系統中有今日日記、2 個 gcal events、3 個 due today tasks、1 個今日 entry
WHEN 使用者瀏覽 /today
THEN 全部 4 個 sections 顯示對應內容
AND 無 loading spinner（各 section 獨立 suspense）

#### Scenario: 今日無日記時顯示 CTA
GIVEN 今日尚無日記
WHEN 使用者瀏覽 /today
THEN JournalSection 顯示 "Start today's journal" CTA
AND 點擊後導向 /today/journal（新建日記）

#### Scenario: 點擊日記摘要進入編輯
GIVEN 今日日記已存在
WHEN 使用者點擊 JournalSection 的 "Edit" 按鈕
THEN 導向 /today/journal 編輯頁

### Error Handling

#### Scenario: GCal 未連線時隱藏 Calendar Section
GIVEN GCal 未設定（無 gcal_integrations 記錄）
WHEN 使用者瀏覽 /today
THEN CalendarSection 不顯示（非 error，而是條件渲染）

#### Scenario: Tasks API 失敗不影響其他 section
GIVEN GET /api/v1/tasks 回傳 500
WHEN Today 頁面載入
THEN Tasks section 顯示 "Could not load tasks"
AND Journal / Calendar / Entries sections 正常顯示

### Edge Cases

#### Scenario: 午夜前後日期邊界
GIVEN 使用者在 23:59 開啟 Today 頁面
WHEN 時間過 00:00（隔日）
THEN 頁面重新整理後顯示新的一天（不自動更新，需手動 refresh）
