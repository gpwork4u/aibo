/**
 * Kanban 純函式工具：負責「拖放後計算新分組與位置」的邏輯，
 * 不碰 React 狀態，方便 vitest 單測。
 */
import type { Task } from "@/lib/api/tasks";
import type { TaskStatus } from "@/lib/projects/kanban-testids";

export type KanbanStatus = Exclude<TaskStatus, "cancelled">;
export const KANBAN_STATUS_LIST: ReadonlyArray<KanbanStatus> = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export function isKanbanStatus(s: string): s is KanbanStatus {
  return (KANBAN_STATUS_LIST as ReadonlyArray<string>).includes(s);
}

export interface KanbanTaskLike {
  id: string;
  status: TaskStatus;
  position: number;
  due_date?: string | null;
  priority?: string;
  title?: string;
  refs?: unknown[];
}

/** 將 tasks 依 status 分組並排序（cancelled 不顯示在 board）。 */
export function groupTasksByStatus<T extends KanbanTaskLike>(
  tasks: T[],
): Record<KanbanStatus, T[]> {
  const out: Record<KanbanStatus, T[]> = {
    todo: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  for (const t of tasks) {
    if (isKanbanStatus(t.status)) out[t.status].push(t);
  }
  for (const s of KANBAN_STATUS_LIST) {
    out[s].sort((a, b) => a.position - b.position);
  }
  return out;
}

export interface ComputeNewPositionInput {
  /** 拖移中的 task id */
  activeId: string;
  /** drop 目標 id：可能是另一張 card.id，或 column drop zone id `col-{status}` */
  overId: string;
  /** 全部 tasks（會在內部依 status 分組） */
  tasks: KanbanTaskLike[];
}

export interface ComputeNewPositionResult {
  taskId: string;
  fromStatus: KanbanStatus;
  toStatus: KanbanStatus;
  /** 0-based 在目標欄的新位置（已扣除自己原本佔的格） */
  toIndex: number;
  /** 是否真的有變動（同欄同位則 false） */
  changed: boolean;
}

/**
 * 計算拖放後的新分組與位置。
 *
 * - overId 為 `col-{status}` 形式 → drop 在該欄末端
 * - overId 為另一個 task.id → 插入在該卡片之前
 * - 跨欄移動：自己被視為從來源欄移除後再插入
 * - 同欄移動：插入位置會自動補償自己原本佔的位置
 */
export function computeNewPosition(
  input: ComputeNewPositionInput,
): ComputeNewPositionResult | null {
  const { activeId, overId, tasks } = input;
  const active = tasks.find((t) => t.id === activeId);
  if (!active || !isKanbanStatus(active.status)) return null;

  const fromStatus = active.status;

  // 解析目標欄
  let toStatus: KanbanStatus | null = null;
  if (overId.startsWith("col-")) {
    const s = overId.slice(4);
    if (isKanbanStatus(s)) toStatus = s;
  } else {
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && isKanbanStatus(overTask.status)) {
      toStatus = overTask.status;
    }
  }
  if (!toStatus) return null;

  const grouped = groupTasksByStatus(tasks);
  const targetList = grouped[toStatus];

  let toIndex: number;
  if (overId.startsWith("col-")) {
    // drop 在欄末端
    toIndex =
      fromStatus === toStatus ? targetList.length - 1 : targetList.length;
    if (toIndex < 0) toIndex = 0;
  } else {
    const overIdx = targetList.findIndex((t) => t.id === overId);
    if (overIdx === -1) {
      toIndex = targetList.length;
    } else if (fromStatus === toStatus) {
      const fromIdx = targetList.findIndex((t) => t.id === activeId);
      // 同欄拖移：若往下拖過自己，目的索引不需 +1
      toIndex = overIdx;
      if (fromIdx !== -1 && fromIdx < overIdx) {
        toIndex = overIdx; // arrayMove semantics with @dnd-kit closestCorners
      }
    } else {
      toIndex = overIdx;
    }
  }

  const fromIdx = grouped[fromStatus].findIndex((t) => t.id === activeId);
  const changed = !(fromStatus === toStatus && fromIdx === toIndex);

  return { taskId: activeId, fromStatus, toStatus, toIndex, changed };
}

/**
 * 將樂觀更新套用到 tasks（回傳新陣列，不改原物件）。
 *
 * 為了讓 UI 立即反映，我們在這裡同時：
 * 1. 把目標 task 的 status 設為 toStatus
 * 2. 重新指派 position（依新順序 0,1,2,...）
 */
export function applyOptimisticMove<T extends KanbanTaskLike>(
  tasks: T[],
  result: ComputeNewPositionResult,
): T[] {
  const { taskId, fromStatus, toStatus, toIndex } = result;
  const grouped = groupTasksByStatus(tasks);

  // 從來源欄移除
  const sourceList = grouped[fromStatus].filter((t) => t.id !== taskId);
  // 找到 active task
  const active = tasks.find((t) => t.id === taskId);
  if (!active) return tasks;

  if (fromStatus === toStatus) {
    const insertIdx = Math.max(0, Math.min(toIndex, sourceList.length));
    sourceList.splice(insertIdx, 0, { ...active, status: toStatus } as T);
    grouped[fromStatus] = sourceList;
  } else {
    grouped[fromStatus] = sourceList;
    const targetList = [...grouped[toStatus]];
    const insertIdx = Math.max(0, Math.min(toIndex, targetList.length));
    targetList.splice(insertIdx, 0, { ...active, status: toStatus } as T);
    grouped[toStatus] = targetList;
  }

  // 重編 position（每個欄獨立）
  const out: T[] = [];
  // 保留 cancelled 等不在 board 的 status 原樣
  const kanbanIdSet = new Set<string>();
  for (const s of KANBAN_STATUS_LIST) {
    grouped[s].forEach((t, i) => {
      out.push({ ...t, status: s, position: i } as T);
      kanbanIdSet.add(t.id);
    });
  }
  for (const t of tasks) {
    if (!kanbanIdSet.has(t.id)) out.push(t);
  }
  return out;
}
