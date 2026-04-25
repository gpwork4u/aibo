# JournalEditor

每日日記編輯器：Tabs（編輯／預覽）+ autoGrow Textarea + 既有 MarkdownViewer 預覽。

---

## 用途

`/journal/:date` 編輯頁的核心輸入元件。同時被 LLM Draft 流程與使用者手動撰寫共用。

---

## 結構

```
┌──────────────────────────────────────────────┐
│ Tabs：[ 編輯 ●  ] [ 預覽 ]                    │  ← TabsList
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ Title 輸入框（選填）                       │ │  ← Editor 模式才顯示
│ ├──────────────────────────────────────────┤ │
│ │                                          │ │
│ │   Markdown 內容...                       │ │
│ │   （autoGrow textarea）                  │ │
│ │                                          │ │
│ │                                          │ │
│ ├──────────────────────────────────────────┤ │
│ │ 1234 字 · 最多 20000                      │ │  ← word count footer
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

預覽模式：

```
┌──────────────────────────────────────────────┐
│ [ 編輯 ] [ 預覽 ●  ]                          │
├──────────────────────────────────────────────┤
│ <article class="prose">                      │
│   # 標題                                      │
│   今天和小明一起⋯                            │
│ </article>                                    │
└──────────────────────────────────────────────┘
```

---

## Props

```ts
interface JournalEditorProps {
  date: string;                   // 'YYYY-MM-DD'
  title: string | null;
  content: string;                // markdown
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  isLoading?: boolean;            // initial fetch
  isSaving?: boolean;             // PATCH 中
  isDraft?: boolean;              // 用於 textarea 邊框視覺區分
  maxLength?: number;             // default 20000
  readOnly?: boolean;
  defaultTab?: "write" | "preview";
}
```

---

## Tailwind / 範例

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MarkdownViewer } from "@/components/markdown-viewer";  // 既有
import { cn } from "@/lib/utils";
import { JOURNAL_TESTIDS } from "@/lib/testids/journal";

<Tabs defaultValue={defaultTab ?? "write"} data-testid={JOURNAL_TESTIDS.editorTabs}>
  <TabsList className="grid grid-cols-2 w-full max-w-xs">
    <TabsTrigger
      value="write"
      data-testid={JOURNAL_TESTIDS.editorTabWrite}
      aria-label="切換到編輯模式"
    >
      編輯
    </TabsTrigger>
    <TabsTrigger
      value="preview"
      data-testid={JOURNAL_TESTIDS.editorTabPreview}
      aria-label="切換到預覽模式"
    >
      預覽
    </TabsTrigger>
  </TabsList>

  <TabsContent value="write" className="mt-3 space-y-2">
    <Input
      placeholder="標題（選填）"
      value={title ?? ""}
      onChange={(e) => onTitleChange(e.target.value)}
      maxLength={120}
      disabled={readOnly || isSaving}
      data-testid={JOURNAL_TESTIDS.editorTitleInput}
      aria-label="日記標題"
      className="text-lg font-medium"
    />
    <div
      className={cn(
        "rounded-md border bg-card transition-colors",
        isDraft && "border-warning/40 bg-warning/[0.03]",
      )}
    >
      <Textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={`寫下 ${formatDateZh(date)} 的日記...\n\n支援 Markdown 語法`}
        maxLength={maxLength ?? 20000}
        disabled={readOnly || isSaving}
        data-testid={JOURNAL_TESTIDS.editorTextarea}
        aria-label={`${date} 日記內容`}
        rows={16}
        className={cn(
          "min-h-[360px] resize-none border-0 bg-transparent font-mono text-sm leading-relaxed",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
        )}
      />
      <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-muted-foreground">
        <span data-testid={JOURNAL_TESTIDS.editorWordCount}>
          {content.length.toLocaleString()} 字 · 最多 {(maxLength ?? 20000).toLocaleString()}
        </span>
        {isSaving && <span className="text-success">儲存中…</span>}
      </div>
    </div>
  </TabsContent>

  <TabsContent value="preview" className="mt-3">
    <article
      className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-card p-4"
      data-testid={JOURNAL_TESTIDS.editorPreview}
    >
      {content.trim().length === 0 ? (
        <p className="italic text-muted-foreground">尚無內容</p>
      ) : (
        <MarkdownViewer source={content} />
      )}
    </article>
  </TabsContent>
</Tabs>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| Tab 切換 | 透過 keyboard `←/→` 在 Tabs 之間移動（shadcn Tabs 內建） |
| 自動儲存 | 由 parent 處理（debounce 1500ms PATCH /journal/:date） |
| Ctrl/Cmd+S | 立即觸發 onSave（parent 處理 listener） |
| 字數超過 maxLength | textarea 原生擋住輸入；footer 字數變紅（`text-destructive`） |
| isDraft = true | textarea 容器加上 `border-warning/40` 微黃色提示 |
| readOnly = true | textarea + title 皆 disabled，preview tab 仍可用 |

### data-testid 對應

| 元素 | testid |
|------|--------|
| Tabs root | `JOURNAL_TESTIDS.editorTabs` |
| Tab：編輯 | `JOURNAL_TESTIDS.editorTabWrite` |
| Tab：預覽 | `JOURNAL_TESTIDS.editorTabPreview` |
| Title input | `JOURNAL_TESTIDS.editorTitleInput` |
| Textarea | `JOURNAL_TESTIDS.editorTextarea` |
| Preview article | `JOURNAL_TESTIDS.editorPreview` |
| Word count | `JOURNAL_TESTIDS.editorWordCount` |

---

## States

| 狀態 | 視覺 |
|------|------|
| 預設 | 卡片邊框 `border-border`、背景 `bg-card` |
| Focus（textarea） | 容器 `ring-2 ring-ring ring-offset-2` |
| Draft（is_draft=true） | 容器 `border-warning/40 bg-warning/[0.03]` |
| ReadOnly | textarea / title `opacity-60 cursor-not-allowed` |
| Saving | 右下顯示「儲存中…」`text-success` |
| 字數超限警告 | 字數變 `text-destructive` |

---

## a11y

- Tab 切換完整 keyboard 支援（shadcn 預設）
- `aria-label` 描述各區塊角色
- Title input 與 textarea 都需有 `aria-label`（無 visible label 時）
- focus ring 統一 `ring-ring`
- 對比：`text-muted-foreground` 字數區塊 ≥ 4.5:1 已驗證（Sprint 8 同款）
- 支援 `prefers-reduced-motion`（Tabs 動畫由 shadcn 處理）

---

## 範例文案

```
標題：清明連假第一天
內容：
# 清明連假第一天

今天和家人一起去掃墓，回程在山上的咖啡店坐了一下午。
- 想到要重構 entry classifier
- 預計這週末動工

(1234 字 · 最多 20000)
```
