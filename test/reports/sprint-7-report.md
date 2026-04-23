# Sprint 7 Browser Test Report

**Sprint**: 7（前端 UI）
**Issues**: #60 F-021, #61 F-022, #62 F-023, #63 F-024, #64 F-025
**QA Issue**: #65
**Framework**: Playwright v1.45
**Base URL**: `http://localhost:3000`
**API URL**: `http://localhost:8080`

## 測試狀態

> **備註**：本 Sprint 的前端頁面仍在開發中，測試框架與斷言已先行建立。
> 實際執行時 `npm test` 可能會因 `data-testid` 尚未加入或頁面未實作而 fail。
> engineer 實作頁面時請依下表 `data-testid` 對照加入測試 hook。

## 測試檔案

| File | Feature | Scenarios |
|------|---------|-----------|
| `specs/f021_layout.spec.ts` | F-021 基礎 + Layout | Bootstrap、Layout、認證、Sidebar、Dark mode、Mobile |
| `specs/f022_api_keys.spec.ts` | F-022 API Keys | 列表、建立、複製、撤銷、最後一把保護、名稱重複 |
| `specs/f023_entries.spec.ts` | F-023 Entries + Inbox | CRUD、搜尋、篩選、Markdown、移至分類 |
| `specs/f024_categories_providers.spec.ts` | F-024 Categories + Providers | 分類 CRUD、Provider CRUD、健康檢查、URL 驗證 |
| `specs/f025_search.spec.ts` | F-025 搜尋 | 即時搜尋、篩選、URL 同步、清除 |

## data-testid 對照表（engineer 必讀）

### F-021 Layout / Bootstrap

- `bootstrap-welcome` — Bootstrap 歡迎訊息
- `bootstrap-name-input` — Key 名稱 input
- `bootstrap-submit` — 建立按鈕
- `bootstrap-created-key` — 建立成功顯示完整 key 的元素
- `bootstrap-continue` — 「繼續」按鈕
- `app-sidebar`、`app-header`、`app-main` — Layout 三大區塊
- `nav-inbox`、`nav-entries`、`nav-categories`、`nav-search`、`nav-api-keys`、`nav-llm-providers` — Sidebar 導航項目
- `sidebar-inbox-badge` — Inbox 數量 badge
- `theme-toggle` — Dark mode 切換
- `mobile-menu-toggle`、`sidebar-overlay` — Mobile 漢堡選單
- `create-entry-button` — Inbox / Entries 快速新增按鈕

### F-022 API Keys

- `api-keys-table`、`api-key-row`
- `key-name`、`key-prefix`、`key-status`、`key-expires-at`、`key-last-used`
- `create-api-key-button`、`create-api-key-dialog`
- `api-key-name-input`、`api-key-submit`
- `show-api-key-dialog`、`full-api-key`、`copy-key-button`、`confirm-copied-button`
- `revoke-key-button`、`revoke-confirm-dialog`、`revoke-confirm-button`

### F-023 Entries / Inbox

- `inbox-empty-state`
- `entry-form-dialog`、`entry-title-input`、`entry-content-input`、`entry-submit`
- `entry-row`、`entry-title-or-preview`
- `entries-search-input`、`category-filter-select`、`category-option-<id>`
- `entry-detail-title`、`entry-markdown-content`、`edit-entry-button`
- `move-to-category-button`、`move-to-category-popover`
- `entry-actions`、`delete-entry-menu-item`、`delete-entry-confirm-dialog`、`delete-confirm-button`

### F-024 Categories + LLM Providers

- `categories-empty-state`、`category-row`、`category-entry-count`
- `create-category-button`、`category-form-dialog`
- `category-name-input`、`category-description-input`、`category-submit`
- `edit-category-button`、`delete-category-button`、`delete-category-confirm-dialog`
- `provider-row`、`default-badge`、`health-status-unknown|loading|healthy|unhealthy`
- `create-provider-button`、`provider-form-dialog`
- `provider-name-input`、`provider-endpoint-input`、`provider-api-key-input`、`provider-model-input`
- `advanced-settings-toggle`、`provider-temperature-input`
- `api-key-status`、`update-api-key-button`
- `edit-provider-button`、`health-check-button`、`provider-submit`

### F-025 Search

- `search-input`、`search-hint`、`search-clear-button`
- `search-result-card`、`result-title`、`result-highlight`
- `search-no-results`
- `advanced-filters-toggle`、`filter-category-select`、`filter-tags-input`
- `search-mode-toggle`、`search-mode-simple`（可選）

## 執行方式

```bash
cd test/browser
npm install
npx playwright install chromium firefox

# 需先啟動 frontend + api stack
docker compose up -d db api frontend

# 執行
npm test

# 只跑 chromium
npx playwright test --project=chromium

# Headed debug
npm run test:headed
```

## 報告輸出

- HTML report: `test/screenshots/report/`
- JSON: `test/reports/browser-results.json`
- 失敗截圖 / video: 於 HTML report 內

## 後續追蹤

- engineer 實作頁面時請逐一加入 `data-testid`
- QA 在實作完成後重新執行測試，針對 fail case 開 bug issue（附截圖）
- Mobile viewport 測試限定於 `f021_layout.spec.ts`（playwright.config.ts 已設定 testMatch）
