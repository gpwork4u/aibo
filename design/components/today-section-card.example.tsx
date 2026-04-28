// TodaySectionCard 使用範例
// Today Dashboard 的共用 section 容器 + 四個 section 特化

import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckSquare,
  Layers,
  Pencil,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// --- Base SectionCard ---

interface SectionCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

function SectionCard({
  id,
  icon,
  title,
  badge,
  children,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: SectionCardProps) {
  const headingId = `${id}-heading`;

  return (
    <Card
      component="section"
      aria-labelledby={headingId}
      aria-busy={isLoading}
      className={cn("shadow-sm", className)}
    >
      <CardHeader className="px-5 py-4 flex flex-row items-center gap-2">
        <span className="text-muted-foreground" aria-hidden="true">{icon}</span>
        <h2 id={headingId} className="text-sm font-semibold text-foreground flex-1">
          {title}
        </h2>
        {badge}
      </CardHeader>

      <Separator />

      <CardContent className="px-5 pb-5 pt-4">
        {error ? (
          <SectionErrorState error={error} onRetry={onRetry} />
        ) : isLoading ? (
          <SectionSkeleton />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// --- Skeleton ---

function SectionSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "h-4 rounded bg-muted animate-pulse",
            i === 2 && "w-3/4",
            i === 3 && "w-1/2"
          )}
        />
      ))}
    </div>
  );
}

// --- Error State ---

function SectionErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-4">
      <AlertCircle className="h-8 w-8 text-destructive/60" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">無法載入</p>
      {error.message && (
        <p className="text-xs text-muted-foreground text-center">{error.message}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          重試
        </Button>
      )}
    </div>
  );
}

// ============================================================
// JournalSection
// ============================================================

interface JournalSectionProps {
  journal?: { summary: string; updatedAt: string } | null;
  isLoading?: boolean;
  error?: Error | null;
  onEdit?: () => void;
  onCreateJournal?: () => void;
  onRetry?: () => void;
}

export function JournalSection({
  journal,
  isLoading,
  error,
  onEdit,
  onCreateJournal,
  onRetry,
}: JournalSectionProps) {
  return (
    <SectionCard
      id="journal"
      icon={<BookOpen className="h-4 w-4" />}
      title="今日日記"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {journal ? (
        <div className="space-y-3">
          <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
            {journal.summary}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(journal.updatedAt), {
                addSuffix: true,
                locale: zhTW,
              })}
            </span>
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              編輯
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">今天還沒有日記</p>
          <Button variant="default" size="sm" onClick={onCreateJournal} className="gap-1.5">
            <Plus className="h-4 w-4" />
            開始今日日記
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// CalendarSection
// ============================================================

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // "HH:mm"
  color?: string;
}

interface CalendarSectionProps {
  events?: CalendarEvent[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function CalendarSection({
  events = [],
  isLoading,
  error,
  onRetry,
}: CalendarSectionProps) {
  return (
    <SectionCard
      id="calendar"
      icon={<Calendar className="h-4 w-4" />}
      title="今日行程"
      badge={
        events.length > 0 ? (
          <Badge variant="secondary" className="text-xs rounded-full">
            {events.length}
          </Badge>
        ) : undefined
      }
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">今日無行程</p>
      ) : (
        <ul className="space-y-3" aria-label="今日行程列表">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0">
                {event.startTime}
              </span>
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: event.color ?? "hsl(var(--primary))" }}
                aria-hidden="true"
              />
              <span className="text-sm text-foreground line-clamp-1">{event.title}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ============================================================
// TaskSection
// ============================================================

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  isDone: boolean;
}

interface TaskSectionProps {
  tasks?: Task[];
  isLoading?: boolean;
  error?: Error | null;
  onToggleTask?: (id: string, done: boolean) => void;
  onRetry?: () => void;
}

const priorityConfig = {
  high: { label: "High", className: "bg-destructive/90 text-destructive-foreground text-xs" },
  medium: { label: "Med", className: "bg-warning/20 text-amber-800 dark:text-amber-200 text-xs" },
  low: { label: "Low", className: "text-muted-foreground border text-xs" },
};

export function TaskSection({
  tasks = [],
  isLoading,
  error,
  onToggleTask,
  onRetry,
}: TaskSectionProps) {
  const pending = tasks.filter((t) => !t.isDone);
  const done = tasks.filter((t) => t.isDone);

  return (
    <SectionCard
      id="tasks"
      icon={<CheckSquare className="h-4 w-4" />}
      title="今日任務"
      badge={
        pending.length > 0 ? (
          <Badge variant="secondary" className="text-xs rounded-full">
            {pending.length}
          </Badge>
        ) : undefined
      }
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <CheckCircle className="h-8 w-8 text-green-500/60" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">今日無待辦事項</p>
        </div>
      ) : (
        <ul className="space-y-2.5" aria-label="今日任務列表">
          {[...pending, ...done].slice(0, 5).map((task) => (
            <li key={task.id} className="flex items-center gap-3">
              <Checkbox
                checked={task.isDone}
                aria-label={task.title}
                onCheckedChange={(v) => onToggleTask?.(task.id, !!v)}
                className="shrink-0"
              />
              <span
                className={cn(
                  "text-sm flex-1 line-clamp-1",
                  task.isDone && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </span>
              <Badge
                variant={task.priority === "low" ? "outline" : "default"}
                className={priorityConfig[task.priority].className}
              >
                {priorityConfig[task.priority].label}
              </Badge>
            </li>
          ))}
          {tasks.length > 5 && (
            <li>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                查看全部 {tasks.length} 筆
              </Button>
            </li>
          )}
        </ul>
      )}
    </SectionCard>
  );
}

// ============================================================
// RecentEntriesSection
// ============================================================

interface RecentEntry {
  id: string;
  title: string;
  updatedAt: string;
}

interface RecentEntriesSectionProps {
  entries?: RecentEntry[];
  isLoading?: boolean;
  error?: Error | null;
  onEntryClick?: (id: string) => void;
  onRetry?: () => void;
}

export function RecentEntriesSection({
  entries = [],
  isLoading,
  error,
  onEntryClick,
  onRetry,
}: RecentEntriesSectionProps) {
  return (
    <SectionCard
      id="recent-entries"
      icon={<Layers className="h-4 w-4" />}
      title="最近更新"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          今日尚無新增或更新的項目
        </p>
      ) : (
        <ul className="space-y-2.5" aria-label="最近更新項目">
          {entries.slice(0, 5).map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 cursor-pointer hover:text-foreground group"
              onClick={() => onEntryClick?.(entry.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onEntryClick?.(entry.id)}
            >
              <span className="text-sm font-medium line-clamp-1 flex-1 group-hover:underline">
                {entry.title}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(entry.updatedAt), {
                  addSuffix: true,
                  locale: zhTW,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ============================================================
// Today Page 組合示範
// ============================================================

export function TodayPageDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <JournalSection
        journal={{
          summary: "今天完成了 Sprint 14 的設計工作，專注在 inbox 和 library 的視覺改善。",
          updatedAt: new Date().toISOString(),
        }}
      />
      <CalendarSection
        events={[
          { id: "1", title: "Morning standup", startTime: "09:00", color: "#4285f4" },
          { id: "2", title: "Design review", startTime: "14:00", color: "#0f9d58" },
        ]}
      />
      <TaskSection
        tasks={[
          { id: "1", title: "完成 sprint review", priority: "high", isDone: false },
          { id: "2", title: "回覆客戶 email", priority: "low", isDone: true },
        ]}
      />
      <RecentEntriesSection
        entries={[
          { id: "1", title: "React Server Components 最佳實踐", updatedAt: new Date().toISOString() },
        ]}
      />
    </div>
  );
}

// Loading state demo
export function TodayPageLoadingDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <JournalSection isLoading />
      <CalendarSection isLoading />
      <TaskSection isLoading />
      <RecentEntriesSection isLoading />
    </div>
  );
}

// Error state demo
export function TodayPageErrorDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <JournalSection error={new Error("Network error")} onRetry={() => {}} />
      <CalendarSection error={new Error("Google Calendar 連線失敗")} onRetry={() => {}} />
      <TaskSection />
      <RecentEntriesSection />
    </div>
  );
}
