/**
 * Journal 頁面 data-testid 常數。
 *
 * 必須與 `test/browser/fixtures/journal.ts` 的 `JOURNAL_TESTIDS` 保持一致，
 * 修改時請同步更新兩邊。
 */
export const JOURNAL_TESTIDS = {
  // 列表頁 /journal
  listPage: "journal-list-page",
  listEmpty: "journal-list-empty",
  listEmptyWriteFirst: "journal-list-empty-write-first",
  listMoodFilter: "journal-list-mood-filter",
  listMoodOption: (mood: string) => `journal-list-mood-option-${mood}`,
  listItem: "journal-list-item",
  listItemByDate: (date: string) => `journal-list-item-${date}`,
  listItemDraftBadge: "journal-list-item-draft-badge",
  listItemMoodEmoji: "journal-list-item-mood-emoji",
  listItemPreview: "journal-list-item-preview",

  // Heatmap
  heatmap: "journal-heatmap",
  heatmapCell: (date: string) => `journal-heatmap-cell-${date}`,
  heatmapLegend: "journal-heatmap-legend",

  // 編輯頁 /journal/:date
  editorPage: "journal-editor-page",
  editorTitle: "journal-editor-title",
  editorContent: "journal-editor-content",
  editorPreviewTab: "journal-editor-preview-tab",
  editorWriteTab: "journal-editor-write-tab",
  editorSaveButton: "journal-editor-save-button",
  editorDeleteButton: "journal-editor-delete-button",
  editorEmptyState: "journal-editor-empty-state",

  moodPicker: "journal-mood-picker",
  moodOption: (mood: string) => `journal-mood-option-${mood}`,

  llmDraftButton: "journal-llm-draft-button",
  llmDraftLoading: "journal-llm-draft-loading",
  draftBanner: "journal-draft-banner",
  draftBannerConfirmButton: "journal-draft-banner-confirm-button",
  draftBannerRegenerateButton: "journal-draft-banner-regenerate-button",

  sourceRefsPanel: "journal-source-refs-panel",
  sourceRefEntry: "journal-source-ref-entry",
  sourceRefEvent: "journal-source-ref-event",

  toastSaved: "journal-toast-saved",
  toastLlmUnavailable: "journal-toast-llm-unavailable",
  dialogConflict: "journal-dialog-conflict",
  dialogConflictReload: "journal-dialog-conflict-reload",
} as const;
