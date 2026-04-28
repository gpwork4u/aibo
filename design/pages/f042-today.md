# Today Dashboard Page（Sprint 14）

## 對應 Feature

#208 F-042: Today Dashboard

## 路由

`/today`

## 版型

```
┌─────────────────────────────────────────────────────────────┐
│  App Shell Navbar (h-14)                                    │
├──────────┬──────────────────────────────────────────────────┤
│ Sidebar  │  TodayHeader (h-20)                              │
│ (w-60)   │  今天，2026年4月28日 星期二     [早安，用戶名稱]  │
│          ├──────────────────────────────────────────────────┤
│ [All]    │  2-column grid (lg) / 1-column (sm)              │
│ [Inbox]  │                                                  │
│ [Today]* │  ┌─────────────────────┐ ┌───────────────────┐  │
│ ─────    │  │ JournalSection      │ │ CalendarSection   │  │
│ [Views]  │  │                     │ │                   │  │
│          │  │ 今日日記摘要...      │ │ 09:00 standup     │  │
│          │  │                     │ │ 14:00 review      │  │
│          │  │ [Edit]              │ │                   │  │
│          │  └─────────────────────┘ └───────────────────┘  │
│          │                                                  │
│          │  ┌─────────────────────┐ ┌───────────────────┐  │
│          │  │ TaskSection    [2]  │ │ RecentEntries     │  │
│          │  │                     │ │                   │  │
│          │  │ [ ] 完成 review     │ │ RSC 最佳實踐  2m   │  │
│          │  │ [x] 回覆 email      │ │ 設計系統  1h      │  │
│          │  │                     │ │                   │  │
│          │  └─────────────────────┘ └───────────────────┘  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

## 區塊規格

### TodayHeader

- 高度：`h-20`，padding `px-6 py-4`
- 左側：
  - 日期：`text-2xl font-semibold`（e.g. "今天，2026 年 4 月 28 日"）
  - 星期：`text-sm text-muted-foreground`
- 右側：
  - 問候語：`text-sm text-muted-foreground`（早上好 / 午安 / 晚安，根據時段）
- 邊框：`border-b border-border`

### Section Grid

- 版型：`grid grid-cols-1 gap-4 lg:grid-cols-2`
- Section 順序（固定）：Journal、Calendar、Tasks、RecentEntries
- CalendarSection：僅在 GCal 連線時渲染；無 GCal 時 grid 變為單欄全寬 journal + 右側兩個 section 堆疊

### 各 Section Card

完整規格見 `design/components/today-section-card.md`

| Section | 資料來源 | empty state |
|---------|---------|-------------|
| JournalSection | GET /api/v1/journal/:date | CreateJournal CTA |
| CalendarSection | GET /api/v1/calendar/days/:date | "今日無行程" |
| TaskSection | GET /api/v1/tasks?due_date=today | CheckCircle + "今日無待辦" |
| RecentEntriesSection | GET /api/v1/entries?updated_since | "今日尚無更新" |

### 各 Section Suspense Boundary

每個 section 都有獨立 `<Suspense>` + error boundary：
- Loading：`isLoading` skeleton（3 行 animate-pulse）
- Error：`AlertCircleIcon` + "無法載入" + [重試]
- 單一 section 失敗不影響其他 section 渲染

## States（整頁）

| State | 呈現方式 |
|-------|---------|
| 首次載入 | 4 個 section 同時顯示 skeleton |
| 部分失敗 | 失敗的 section 顯示 error state，其他正常 |
| GCal 未連線 | CalendarSection 直接不渲染（非 error） |

## 響應式

| 斷點 | 版型變化 |
|------|---------|
| >= 1024px | 2-column grid |
| < 1024px | 1-column stack |
| < 768px | Sidebar 漢堡；Header 縮小至 h-14 |

## Accessibility

- `<main aria-label="Today Dashboard">`
- TodayHeader：`<header>`
- 日期：`<time dateTime="2026-04-28">`
- Section 使用 `<section aria-labelledby>` 參考 `today-section-card.md`

## 使用的元件

| 元件 | 規格來源 |
|------|---------|
| `JournalSection` | `design/components/today-section-card.md` |
| `CalendarSection` | `design/components/today-section-card.md` |
| `TaskSection` | `design/components/today-section-card.md` |
| `RecentEntriesSection` | `design/components/today-section-card.md` |
| `SavedViewsList` | `design/components/saved-views-chip.md` |
