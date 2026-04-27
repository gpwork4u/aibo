// Card Chrome 使用範例
// 技術棧：Tailwind CSS v4 + shadcn/ui
// 對應規格：design/components/card/spec.md

import { Inbox, BookOpen, CalendarDays, Bot, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// --- 標準卡片 ---
export function StandardCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-[color:var(--fg-muted)]" aria-hidden="true" />
          <CardTitle>Inbox</CardTitle>
        </div>
        <CardDescription>未處理的項目</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[color:var(--fg-muted)]">3 則新通知</p>
      </CardContent>
      <CardFooter>
        <Button variant="link" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
          查看更多
        </Button>
      </CardFooter>
    </Card>
  );
}

// --- Dashboard Hub 4-slot Grid ---
export function DashboardHubGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
      {/* Inbox */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[color:var(--fg-muted)]" aria-hidden="true" />
            <CardTitle as="h2">Inbox</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <InboxPreview />
        </CardContent>
        <CardFooter>
          <Button variant="link" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
            查看全部
          </Button>
        </CardFooter>
      </Card>

      {/* Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[color:var(--fg-muted)]" aria-hidden="true" />
            <CardTitle as="h2">Library</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <LibraryPreview />
        </CardContent>
        <CardFooter>
          <Button variant="link" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
            進入資料庫
          </Button>
        </CardFooter>
      </Card>

      {/* Today */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[color:var(--fg-muted)]" aria-hidden="true" />
            <CardTitle as="h2">今日</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <TodayPreview />
        </CardContent>
        <CardFooter>
          <Button variant="link" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
            完整行程
          </Button>
        </CardFooter>
      </Card>

      {/* Copilot */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[color:var(--fg-muted)]" aria-hidden="true" />
            <CardTitle as="h2">Copilot</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CopilotPreview />
        </CardContent>
        <CardFooter>
          <Button variant="link" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
            開啟對話
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// --- Loading State（Skeleton） ---
export function CardLoadingState() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent aria-busy="true" aria-label="載入中">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-8 w-24" />
      </CardFooter>
    </Card>
  );
}

// --- Error State ---
export function CardErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-[color:var(--danger)]">
      <CardContent className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <AlertCircle
          className="w-8 h-8 text-[color:var(--danger)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[color:var(--fg-muted)]">載入失敗</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          aria-label="重新載入"
        >
          重試
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Empty State ---
export function CardEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <p className="text-sm text-[color:var(--fg-muted)]">暫無內容</p>
        <Button variant="secondary" size="sm">
          新增第一個項目
        </Button>
      </CardContent>
    </Card>
  );
}
