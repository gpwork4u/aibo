# DeleteProjectConfirmDialog

刪除專案的二次確認 Dialog。當該專案下有 task 時，必須勾選「強制刪除」checkbox 才能送出，並於 API 加上 `?force=true`。

對齊 spec：
- F-031 API：`DELETE /api/v1/projects/:id` → 204；有 tasks 時拒絕（409 PROJECT_HAS_TASKS），須加 `?force=true` 才會 cascade 刪除
- F-032 Edge Case：「刪除有 task 的專案」流程

> 此檔取代 `project-form-dialog.md` 末尾原本的 DeleteProjectConfirmDialog 附錄；保留向後相容指引：舊 `PROJECTS_TESTIDS.deleteDialog*` 仍維持，新增 `forceCheckbox` 與 `taskWarning`。

---

## 用途

兩種觸發路徑：

1. **直接刪除（task 數已知）**：parent 在開啟 Dialog 前已從 `project.open_task_count + project.done_task_count` 等推得 `task_count`，直接傳入 props
2. **回應 409 後再開啟**：parent 先嘗試 `DELETE /api/v1/projects/:id`，若回 409 PROJECT_HAS_TASKS（response 帶 `task_count`）→ 開 Dialog

兩種情況皆可用相同元件，差別只在初始 `task_count` 來源。

---

## 結構

### Case A：task_count = 0

```
┌───────────────────────────────────────────────┐
│ 刪除專案「aibo v2」？                          │
├───────────────────────────────────────────────┤
│ 此操作無法復原。                                │
├───────────────────────────────────────────────┤
│                  [ 取消 ]    [ 確認刪除 ]      │
└───────────────────────────────────────────────┘
```

### Case B：task_count > 0

```
┌───────────────────────────────────────────────┐
│ 刪除專案「aibo v2」？                          │
├───────────────────────────────────────────────┤
│ ⚠ 警告                                         │
│ 此專案下有 12 筆任務，刪除將一併移除這些任務     │
│ 與其關聯資料，且無法復原。                      │
│                                               │
│ ☐ 我了解風險，仍要強制刪除（force=true）        │
│                                               │
├───────────────────────────────────────────────┤
│                  [ 取消 ]    [ 確認刪除 ]      │  ← 「確認刪除」按鈕在勾選前 disabled
└───────────────────────────────────────────────┘
```

---

## Props

```ts
interface DeleteProjectConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
  };
  /**
   * 該專案下的 task 總數（含 done / cancelled）。
   * 來源優先：
   * 1. parent 已知（projectDetail.stats.total）
   * 2. 第一次嘗試 DELETE 後 409 response.task_count
   * undefined 表示尚未取得 → Dialog 內顯示 loading state
   */
  taskCount: number | undefined;

  /**
   * Parent 處理刪除：
   * - taskCount === 0 → force 為 false
   * - taskCount > 0 → 必勾 forceCheckbox 才會呼叫且 force 為 true
   */
  onConfirm: (force: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
}
```

---

## Tailwind / 範例

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PROJECTS_TESTIDS } from "@/lib/testids/projects";

export function DeleteProjectConfirmDialog({
  open, onOpenChange, project, taskCount, onConfirm,
}: DeleteProjectConfirmDialogProps) {
  const [force, setForce] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTasks = taskCount !== undefined && taskCount > 0;
  const isLoadingCount = taskCount === undefined;
  const canSubmit = !isLoadingCount && (!hasTasks || force) && !submitting;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    const res = await onConfirm(hasTasks);   // hasTasks → force=true
    setSubmitting(false);
    if (res.ok) {
      onOpenChange(false);
      setForce(false);
    } else {
      setError(res.message);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid={PROJECTS_TESTIDS.deleteDialog}
        className="sm:max-w-md"
      >
        <AlertDialogHeader>
          <AlertDialogTitle data-testid={PROJECTS_TESTIDS.deleteDialogTitle}>
            刪除專案「{project.name}」？
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoadingCount ? (
                <Skeleton className="h-4 w-full" />
              ) : hasTasks ? (
                <div
                  data-testid={PROJECTS_TESTIDS.deleteDialogTaskWarning}
                  className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <AlertTriangleIcon
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    此專案下有
                    <span
                      data-testid={PROJECTS_TESTIDS.deleteDialogTaskCount}
                      className="mx-1 font-semibold tabular-nums"
                    >
                      {taskCount}
                    </span>
                    筆任務，刪除將一併移除這些任務與其關聯資料，且無法復原。
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">此操作無法復原。</p>
              )}

              {hasTasks && (
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm",
                    force ? "border-destructive bg-destructive/5" : "border-border",
                  )}
                >
                  <Checkbox
                    checked={force}
                    onCheckedChange={(v) => setForce(v === true)}
                    data-testid={PROJECTS_TESTIDS.deleteDialogForceCheckbox}
                    aria-describedby="delete-project-force-hint"
                    className="mt-0.5"
                  />
                  <span className="leading-snug">
                    我了解風險，仍要強制刪除
                    <code
                      id="delete-project-force-hint"
                      className="ml-1 rounded bg-muted px-1 text-[11px] font-mono"
                    >
                      force=true
                    </code>
                  </span>
                </label>
              )}

              {error && (
                <p
                  data-testid={PROJECTS_TESTIDS.deleteDialogError}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            data-testid={PROJECTS_TESTIDS.deleteDialogCancel}
            disabled={submitting}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canSubmit}
            data-testid={PROJECTS_TESTIDS.deleteDialogConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {submitting ? "刪除中…" : "確認刪除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| Open，taskCount=0 | 顯示簡短文案，confirm 按鈕直接可按 |
| Open，taskCount>0 | 顯示 destructive 警告框 + force checkbox；confirm disabled，直到勾選 |
| Open，taskCount=undefined | 顯示 Skeleton；confirm disabled |
| 勾選 force | confirm 按鈕啟用；checkbox 容器 `border-destructive bg-destructive/5` |
| 點 confirm（無 task） | `onConfirm(false)` → `DELETE /api/v1/projects/:id` |
| 點 confirm（有 task + 勾選） | `onConfirm(true)` → `DELETE /api/v1/projects/:id?force=true` |
| 失敗 | 顯示 `error` 紅字，dialog 不關閉，可重試 |
| 成功 | 關閉 dialog（onOpenChange(false)），parent 處理 navigate + toast |
| Esc / 背景 | shadcn AlertDialog 預設 **不可** 點背景關閉（modal）；Esc 仍關閉 |

---

## States

| 狀態 | 視覺 |
|------|------|
| Loading task count | Skeleton 替代描述 |
| Safe（無 task） | muted 文字「此操作無法復原。」 |
| Dangerous（有 task） | destructive 警告框 + force checkbox |
| Force unchecked | confirm 按鈕 disabled，opacity-50 |
| Force checked | checkbox 容器 destructive 邊框 + 淡底；confirm 按鈕啟用 |
| Submitting | 按鈕「刪除中…」，cancel disabled |
| Error | error 訊息顯示在 footer 上方 |

---

## data-testid

| 元素 | testid |
|------|--------|
| Dialog root | `PROJECTS_TESTIDS.deleteDialog` |
| Title | `PROJECTS_TESTIDS.deleteDialogTitle` |
| Task warning box | `PROJECTS_TESTIDS.deleteDialogTaskWarning` |
| Task count number | `PROJECTS_TESTIDS.deleteDialogTaskCount` |
| Force checkbox | `PROJECTS_TESTIDS.deleteDialogForceCheckbox` |
| Cancel button | `PROJECTS_TESTIDS.deleteDialogCancel` |
| Confirm button | `PROJECTS_TESTIDS.deleteDialogConfirm` |
| Error msg | `PROJECTS_TESTIDS.deleteDialogError` |

需新增至 `design/components/projects/testids.md`（在既有 deleteDialog* 後追加）：

```ts
deleteDialogTitle: "project-delete-dialog-title",
deleteDialogTaskWarning: "project-delete-dialog-task-warning",
deleteDialogForceCheckbox: "project-delete-dialog-force-checkbox",
deleteDialogError: "project-delete-dialog-error",
```

---

## a11y

- AlertDialog 比 Dialog 更語意化（`role="alertdialog"`），用於破壞性操作確認
- Title `<AlertDialogTitle>` 自動 `aria-labelledby`
- Description `<AlertDialogDescription>` 自動 `aria-describedby`
- Checkbox 與其 `<label>` 透過 `htmlFor` / 包裹形式連結
- Force checkbox 有 `aria-describedby="delete-project-force-hint"`，提示中包含 `force=true` 技術詞
- 警告以三重表達：`AlertTriangleIcon` + 「警告」語句 + destructive 色
- Confirm 按鈕 disabled 時 `aria-disabled="true"`（shadcn 內建）
- Reduced motion：AlertDialog 開合動畫尊重系統設定（shadcn 內建）
- 對比：destructive / destructive-foreground 既有 token 已驗證 ≥ 4.5:1

---

## 整合流程（parent 範例）

```tsx
const [deleteOpen, setDeleteOpen] = useState(false);
const [taskCount, setTaskCount] = useState<number | undefined>(undefined);

const handleDeleteClick = async () => {
  // 路徑 A：已知 taskCount
  if (project.stats?.total !== undefined) {
    setTaskCount(project.stats.total);
    setDeleteOpen(true);
    return;
  }
  // 路徑 B：先試打 → 409
  setDeleteOpen(true);
  setTaskCount(undefined);
  const res = await api.deleteProject(project.id, false);
  if (res.ok) { router.push("/projects"); toast.success("已刪除"); setDeleteOpen(false); return; }
  if (res.code === "PROJECT_HAS_TASKS") setTaskCount(res.task_count);
};

const handleConfirm = async (force: boolean) => {
  const res = await api.deleteProject(project.id, force);
  if (!res.ok) return { ok: false as const, message: res.message };
  router.push("/projects"); toast.success("已刪除");
  return { ok: true as const };
};

<DeleteProjectConfirmDialog
  open={deleteOpen}
  onOpenChange={setDeleteOpen}
  project={project}
  taskCount={taskCount}
  onConfirm={handleConfirm}
/>
```
