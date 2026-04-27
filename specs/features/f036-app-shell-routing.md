# F-036: App Shell + Routing

## Status: active
## Sprint: 13
## Priority: P0
## GitHub Issues: #195 (feature), #204 (PR)

## 使用者故事
As a user, I want a consistent app shell with sidebar navigation and deep-linkable routes, so that I can navigate between views efficiently and share URLs.

## 設計決策
- 路由策略：Hybrid `/dashboard` hub + 深連結子路由
- Next.js App Router route group `(shell)` 共用 layout（sidebar + top-bar + main-area + copilot-slot）
- `/dashboard` 使用 parallel routes（@inbox / @library / @today / @copilot）
- 深連結子路由：`/dashboard/inbox`、`/library`、`/today`、`/canvas`、`/settings`

## 路由架構

```
app/
├── (shell)/
│   ├── layout.tsx              # Shell layout（sidebar + top-bar + main + copilot-slot）
│   ├── dashboard/
│   │   ├── layout.tsx          # Parallel route orchestrator
│   │   ├── @inbox/page.tsx     # Inbox panel
│   │   ├── @library/page.tsx   # Library panel
│   │   ├── @today/page.tsx     # Today panel
│   │   └── @copilot/page.tsx   # Copilot panel
│   ├── library/page.tsx        # Full-page library（深連結）
│   ├── today/page.tsx          # Full-page today
│   ├── canvas/page.tsx         # Canvas graph（placeholder Sprint 15）
│   └── settings/
│       └── page.tsx            # Settings hub
└── login/page.tsx              # 登入頁（不在 shell 內）
```

## Sidebar 導航項目

| 圖示 | 標籤 | 路由 | 快捷鍵 |
|------|------|------|--------|
| Inbox | Inbox | /dashboard/inbox | G I |
| BookOpen | Library | /library | G L |
| Sun | Today | /today | G T |
| Network | Canvas | /canvas | G C |
| Settings | Settings | /settings | - |

## Shell Layout 結構

```
┌─────────────────────────────────────────┐
│  [sidebar]   │  [top-bar]               │
│  nav items   │  breadcrumb + actions    │
│  ─────────   ├──────────────────────────┤
│              │  [main-area]             │
│              │  <children />            │
│              │                          │
│              │               [copilot-  │
│              │                slot]     │
└─────────────────────────────────────────┘
```

- sidebar 寬度：240px（固定，desktop）；mobile：收合為 icon-only（48px）
- top-bar 高度：48px；含 ⌘K 呼叫按鈕
- copilot-slot：右側 panel，初始 hidden，由 F-047 實作完整功能

## Business Rules
1. `/` redirect 至 `/dashboard`
2. 未登入時，shell 路由 redirect 至 `/login`（由 F-039 cookie auth middleware 控制）
3. 當前路由對應 sidebar nav item 標記 active 狀態
4. parallel routes 預設顯示 @inbox slot
5. 深連結路由（/library、/today 等）為全頁模式，不顯示其他 parallel slots

## Scenarios

### Happy Path

#### Scenario: 根路由重導向
GIVEN 使用者已登入
WHEN 瀏覽 /
THEN redirect 至 /dashboard
AND sidebar 顯示，@inbox slot 為預設 active

#### Scenario: 導航至 /library 深連結
GIVEN 使用者在 /dashboard
WHEN 點擊 sidebar Library 項目
THEN URL 改為 /library
AND 全頁顯示 Library 內容
AND sidebar Library 項目標記 active

#### Scenario: ⌘K 按鈕開啟 Command Palette
GIVEN 使用者在任意 shell 路由
WHEN 點擊 top-bar 的 ⌘K 按鈕
THEN Command Palette overlay 開啟

### Error Handling

#### Scenario: 未登入存取 shell 路由
GIVEN 使用者未登入（無 cookie session）
WHEN 直接瀏覽 /library
THEN redirect 至 /login?next=/library

#### Scenario: 不存在的路由
WHEN 瀏覽 /nonexistent
THEN 顯示 404 page（在 shell 外）

### Edge Cases

#### Scenario: 鍵盤快捷鍵 G I 導航
GIVEN 使用者在 /library
WHEN 鍵入 G 後接 I（Sequential key）
THEN URL 改為 /dashboard/inbox
