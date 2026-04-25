# JOURNAL_TESTIDS

> Journal 元件的 `data-testid` 統一命名表。所有 design 規格與 dev / qa 必須一致引用此命名。

```ts
export const JOURNAL_TESTIDS = {
  // List page
  listPage: "journal-list-page",
  listFilters: "journal-list-filters",
  filterMood: "journal-filter-mood",
  filterDraft: "journal-filter-draft",
  filterDateRange: "journal-filter-date-range",
  listEmpty: "journal-list-empty",
  listEmptyCta: "journal-list-empty-cta",
  listSkeleton: "journal-list-skeleton",
  listError: "journal-list-error",

  // Card
  card: "journal-card",                     // 加 -{date} suffix，例：journal-card-2026-04-23
  cardDate: "journal-card-date",
  cardTitle: "journal-card-title",
  cardMood: "journal-card-mood",
  cardPreview: "journal-card-preview",
  cardDraftBadge: "journal-card-draft-badge",
  cardWordCount: "journal-card-word-count",

  // Editor page
  editorPage: "journal-editor-page",
  editorToolbar: "journal-editor-toolbar",
  editorDate: "journal-editor-date",
  editorBackButton: "journal-editor-back",
  editorSaveButton: "journal-editor-save",
  editorPublishButton: "journal-editor-publish",       // 確認發布（draft → non-draft）
  editorAiDraftCta: "journal-editor-ai-draft-cta",     // 「讓 AI 產生初稿」
  editorTitleInput: "journal-editor-title",
  editorTabs: "journal-editor-tabs",
  editorTabWrite: "journal-editor-tab-write",
  editorTabPreview: "journal-editor-tab-preview",
  editorTextarea: "journal-editor-textarea",
  editorPreview: "journal-editor-preview",
  editorWordCount: "journal-editor-word-count",
  editorBeforeUnloadDialog: "journal-editor-leave-dialog",
  editorConflictDialog: "journal-editor-conflict-dialog",   // 409

  // Mood Picker
  moodPicker: "journal-mood-picker",
  moodOption: "journal-mood-option",            // 加 -{value}：journal-mood-option-great
  moodOptionGreat: "journal-mood-option-great",
  moodOptionOk: "journal-mood-option-ok",
  moodOptionDown: "journal-mood-option-down",

  // Draft Banner
  draftBanner: "journal-draft-banner",
  draftBannerRegenerate: "journal-draft-banner-regenerate",
  draftBannerConfirm: "journal-draft-banner-confirm",       // 「使用此草稿 / 確認發布」
  draftBannerLoading: "journal-draft-banner-loading",       // 生成中狀態

  // Source Refs Panel
  sourceRefsPanel: "journal-source-refs-panel",
  sourceRefsEntries: "journal-source-refs-entries",
  sourceRefsEvents: "journal-source-refs-events",
  sourceRefEntryItem: "journal-source-ref-entry",      // 加 -{entryId}
  sourceRefEventItem: "journal-source-ref-event",      // 加 -{gcalId}

  // Heatmap
  heatmap: "journal-heatmap",
  heatmapModeToggle: "journal-heatmap-mode-toggle",    // 字數 / 心情 切換
  heatmapCell: "journal-heatmap-cell",                 // 加 -{YYYY-MM-DD}
  heatmapLegend: "journal-heatmap-legend",
} as const;
```

## 命名規則

- 所有 testid 以 `journal-` 為 prefix，避免和其他 feature 撞名
- 動態 testid 使用 `-{key}` suffix（如 date、id），key 不含空白與特殊字元
- 單一頁面同時存在多個同類元素時，必須加 suffix 才能精確選取
- QA Playwright 選擇方式：`page.getByTestId('journal-card-2026-04-23')`
