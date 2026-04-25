"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { MarkdownViewer } from "@/components/markdown-viewer";
import { JournalMoodPicker } from "@/components/journal/journal-mood-picker";
import { ApiError } from "@/lib/api/client";
import {
  useCreateJournal,
  useDeleteJournal,
  useDraftJournal,
  useJournal,
  useUpdateJournal,
} from "@/lib/hooks/use-journals";
import { JOURNAL_TESTIDS } from "@/lib/journal/testids";

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function JournalEditorPage() {
  const params = useParams<{ date: string }>();
  const date = params?.date ?? "";
  const router = useRouter();
  const tz = React.useMemo(resolveTimezone, []);

  const journalQuery = useJournal(date);
  const createMut = useCreateJournal();
  const updateMut = useUpdateJournal();
  const deleteMut = useDeleteJournal();
  const draftMut = useDraftJournal();

  const [title, setTitle] = React.useState<string>("");
  const [content, setContent] = React.useState<string>("");
  const [mood, setMood] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<string>("write");
  const [draftBannerOpen, setDraftBannerOpen] = React.useState(false);
  const [draftPending, setDraftPending] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const journal = journalQuery.data;
  const isNotFound =
    journalQuery.isError &&
    journalQuery.error instanceof ApiError &&
    journalQuery.error.status === 404;
  const isFetching = journalQuery.isLoading;

  // 將既有 journal 載入 form
  React.useEffect(() => {
    if (journal) {
      setTitle(journal.title ?? "");
      setContent(journal.content);
      setMood(journal.mood);
    }
  }, [journal]);

  const handleDraft = async () => {
    try {
      const res = await draftMut.mutateAsync({ date, tz });
      setDraftPending(res.draft);
      if (res.mood) setMood(res.mood);
      setDraftBannerOpen(true);
      toast.success("LLM 草稿已生成，請確認後使用");
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const code = (apiErr?.body as { code?: string } | null)?.code;
      let msg = "草稿生成失敗";
      if (code === "LLM_NOT_CONFIGURED")
        msg = "請先在「LLM Provider」設定有效的 LLM 服務";
      else if (code === "LLM_UPSTREAM_ERROR") msg = "LLM 服務暫時無法使用";
      else if (apiErr?.status === 404) msg = "當日無素材，無法生成草稿";
      toast.error(msg, { id: JOURNAL_TESTIDS.toastLlmUnavailable });
    }
  };

  const handleAcceptDraft = () => {
    if (!draftPending) return;
    setContent((prev) => (prev ? prev + "\n\n" + draftPending : draftPending));
    setDraftPending(null);
    setDraftBannerOpen(false);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("內容不能為空");
      return;
    }
    try {
      if (journal) {
        await updateMut.mutateAsync({
          date,
          payload: {
            title: title || null,
            content,
            mood: mood || null,
            is_draft: false,
          },
        });
      } else {
        await createMut.mutateAsync({
          date,
          title: title || null,
          content,
          mood: mood || null,
          is_draft: false,
        });
      }
      toast.success("已儲存", { id: JOURNAL_TESTIDS.toastSaved });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 409) {
        toast.error("該日期已有日記，請重新整理。");
        return;
      }
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(date);
      toast.success("日記已刪除");
      router.push("/journal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div
      className="space-y-6"
      data-testid={JOURNAL_TESTIDS.editorPage}
    >
      <Button variant="ghost" size="sm" asChild>
        <Link href="/journal">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">日記 · {date}</h1>
          <p className="text-sm text-muted-foreground">
            {isNotFound ? "尚未撰寫，今天開始記錄吧" : "編輯今日紀錄"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleDraft}
            disabled={draftMut.isPending}
            data-testid={JOURNAL_TESTIDS.llmDraftButton}
          >
            {draftMut.isPending ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  data-testid={JOURNAL_TESTIDS.llmDraftLoading}
                />
                生成草稿中…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                LLM 生成草稿
              </>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-testid={JOURNAL_TESTIDS.editorSaveButton}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            儲存
          </Button>
          {journal && (
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              data-testid={JOURNAL_TESTIDS.editorDeleteButton}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              刪除
            </Button>
          )}
        </div>
      </div>

      {draftBannerOpen && draftPending && (
        <div
          className="flex items-start justify-between gap-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm"
          data-testid={JOURNAL_TESTIDS.draftBanner}
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">LLM 草稿已準備好</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {draftPending}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDraft}
              data-testid={JOURNAL_TESTIDS.draftBannerRegenerateButton}
            >
              重新生成
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptDraft}
              data-testid={JOURNAL_TESTIDS.draftBannerConfirmButton}
            >
              使用此草稿
            </Button>
          </div>
        </div>
      )}

      {isFetching ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <Input
            placeholder="標題（選填）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid={JOURNAL_TESTIDS.editorTitle}
          />

          <JournalMoodPicker value={mood} onChange={setMood} />

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger
                value="write"
                data-testid={JOURNAL_TESTIDS.editorWriteTab}
              >
                編輯
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                data-testid={JOURNAL_TESTIDS.editorPreviewTab}
              >
                預覽
              </TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="今天記錄什麼？支援 markdown 語法。"
                className="min-h-[400px] font-mono text-sm"
                data-testid={JOURNAL_TESTIDS.editorContent}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {content.length} 字
              </p>
            </TabsContent>
            <TabsContent value="preview">
              <div className="rounded-md border bg-muted/30 p-4 min-h-[400px]">
                {content ? (
                  <MarkdownViewer content={content} />
                ) : (
                  <p
                    className="text-sm italic text-muted-foreground"
                    data-testid={JOURNAL_TESTIDS.editorEmptyState}
                  >
                    （尚無內容）
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除日記？</AlertDialogTitle>
            <AlertDialogDescription>
              {date} 的日記將被永久刪除，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "刪除中…" : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
