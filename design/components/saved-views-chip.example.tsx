// SavedViewsChip 使用範例
// Sidebar Views 區塊 + SavedViewDialog + FilterBar ActiveViewChip

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// --- Types ---

interface SavedView {
  id: string;
  name: string;
  scope: "library" | "inbox";
  icon?: string;
  position: number;
}

interface SavedViewFormData {
  name: string;
  icon?: string;
  scope: "library" | "inbox";
}

// --- Emoji Quick Select ---

const QUICK_EMOJIS = ["📚", "🔬", "💡", "⚙️", "🎯", "🗂️", "📝", "🏷️", "🔖", "✨"];

function EmojiGrid({
  value,
  onChange,
}: {
  value?: string;
  onChange: (emoji: string | undefined) => void;
}) {
  return (
    <div role="radiogroup" aria-label="選擇圖示" className="grid grid-cols-5 gap-1.5">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          role="radio"
          aria-checked={value === emoji}
          type="button"
          onClick={() => onChange(value === emoji ? undefined : emoji)}
          className={cn(
            "h-9 w-9 rounded-md text-base flex items-center justify-center transition-colors",
            "hover:bg-accent",
            value === emoji && "bg-accent border border-ring"
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// --- SavedViewDialog ---

interface SavedViewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: "create" | "edit";
  initialValues?: Partial<SavedView>;
  onSave: (data: SavedViewFormData) => Promise<void>;
}

export function SavedViewDialog({
  open,
  onOpenChange,
  mode = "create",
  initialValues,
  onSave,
}: SavedViewDialogProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [icon, setIcon] = useState<string | undefined>(initialValues?.icon);
  const [nameError, setNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("名稱為必填欄位");
      return;
    }
    if (name.length > 100) {
      setNameError("名稱不能超過 100 個字元");
      return;
    }
    setNameError("");
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), icon, scope: "library" });
      onOpenChange(false);
    } catch {
      // Toast error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "儲存視圖" : "編輯視圖"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="view-name">名稱</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的視圖"
              maxLength={100}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "view-name-error" : undefined}
            />
            {nameError && (
              <p id="view-name-error" className="text-xs text-destructive" role="alert">
                {nameError}
              </p>
            )}
            <p className="text-xs text-muted-foreground text-right">{name.length}/100</p>
          </div>

          {/* Icon Field */}
          <div className="space-y-1.5">
            <Label>圖示（選填）</Label>
            <EmojiGrid value={icon} onChange={setIcon} />
          </div>

          {/* Scope（disabled for Sprint 14） */}
          <div className="space-y-1.5">
            <Label>範圍</Label>
            <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm text-muted-foreground flex items-center">
              Library
            </div>
            <p className="text-xs text-muted-foreground">目前僅支援 Library 範圍</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving} aria-busy={isSaving}>
            {isSaving && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            )}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- SavedViewChip (System) ---

function SystemViewChip({
  view,
  isActive,
  onSelect,
}: {
  view: SavedView;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      role="button"
      aria-pressed={isActive}
      aria-current={isActive ? "page" : undefined}
      onClick={() => onSelect(view.id)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-3 h-9 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "border-l-[3px] border-l-primary bg-accent/40 font-medium text-foreground"
          : "text-foreground/70 hover:bg-accent/20"
      )}
    >
      {view.icon && <span aria-hidden="true">{view.icon}</span>}
      <span className="flex-1 text-left">{view.name}</span>
    </button>
  );
}

// --- SavedViewChip (User, Sortable) ---

function UserViewChip({
  view,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: {
  view: SavedView;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: view.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex w-full items-center gap-1 rounded-md px-2 h-9 text-sm transition-colors",
        isActive
          ? "border-l-[3px] border-l-primary bg-accent/40"
          : "hover:bg-accent/20",
        isDragging && "opacity-50 bg-accent/20"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-60 transition-opacity duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        )}
        aria-label={`Drag to reorder ${view.name}`}
        aria-roledescription="sortable"
        tabIndex={0}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Main button */}
      <button
        role="button"
        aria-pressed={isActive}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onSelect(view.id)}
        className={cn(
          "flex flex-1 items-center gap-2 text-sm min-w-0",
          "focus-visible:outline-none",
          isActive ? "font-medium text-foreground" : "text-foreground/70"
        )}
      >
        {view.icon && <span aria-hidden="true">{view.icon}</span>}
        <span className="flex-1 text-left truncate">{view.name}</span>
      </button>

      {/* Kebab Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              "focus-visible:opacity-100"
            )}
            aria-label={`View options for ${view.name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => onEdit(view.id)}>
            <Pencil className="mr-2 h-4 w-4" />
            編輯
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(view.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            刪除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// --- SavedViewsList (Full Sidebar Section) ---

interface SavedViewsListProps {
  systemViews: SavedView[];
  userViews: SavedView[];
  activeViewId?: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onCreateView: () => void;
}

export function SavedViewsList({
  systemViews,
  userViews,
  activeViewId,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
  onCreateView,
}: SavedViewsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = userViews.findIndex((v) => v.id === active.id);
      const newIndex = userViews.findIndex((v) => v.id === over.id);
      const reordered = [...userViews];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      onReorder(reordered.map((v) => v.id));
    }
  }

  const activeView = userViews.find((v) => v.id === activeId);

  return (
    <div className="space-y-0.5 px-2 py-2">
      <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Views
      </div>

      {/* System Views */}
      {systemViews.map((view) => (
        <SystemViewChip
          key={view.id}
          view={view}
          isActive={activeViewId === view.id}
          onSelect={onSelect}
        />
      ))}

      {/* User Views with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={userViews.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          {userViews.map((view) => (
            <UserViewChip
              key={view.id}
              view={view}
              isActive={activeViewId === view.id}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeView ? (
            <div className="flex items-center gap-2 rounded-md px-3 h-9 text-sm bg-background shadow-lg border border-border opacity-90">
              {activeView.icon && <span aria-hidden="true">{activeView.icon}</span>}
              <span>{activeView.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add View Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start px-3 h-8 text-muted-foreground hover:text-foreground text-xs gap-2"
        onClick={onCreateView}
      >
        + 新增視圖
      </Button>
    </div>
  );
}

// --- ActiveViewChip（FilterBar 中使用） ---

export function ActiveViewChip({
  view,
  onClear,
}: {
  view: SavedView | null;
  onClear: () => void;
}) {
  if (!view) return null;
  return (
    <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 h-8">
      {view.icon && <span aria-hidden="true">{view.icon}</span>}
      <span className="text-xs">{view.name}</span>
      <button
        onClick={onClear}
        aria-label="Clear view filter"
        className="ml-0.5 rounded-sm hover:bg-accent p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// --- Demo ---

export function SavedViewsDemo() {
  const [activeViewId, setActiveViewId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const systemViews: SavedView[] = [
    { id: "all", name: "All", scope: "library", icon: "🗂️", position: 0 },
    { id: "inbox", name: "Inbox", scope: "inbox", icon: "📬", position: 1 },
  ];

  const [userViews, setUserViews] = useState<SavedView[]>([
    { id: "react", name: "React 筆記", scope: "library", icon: "⚛️", position: 0 },
    { id: "design", name: "設計資源", scope: "library", icon: "🎨", position: 1 },
  ]);

  return (
    <div className="w-64 border rounded-lg bg-background">
      <SavedViewsList
        systemViews={systemViews}
        userViews={userViews}
        activeViewId={activeViewId}
        onSelect={setActiveViewId}
        onEdit={(id) => console.log("edit", id)}
        onDelete={(id) => setUserViews((v) => v.filter((x) => x.id !== id))}
        onReorder={(ids) =>
          setUserViews((prev) =>
            ids.map((id, i) => ({ ...prev.find((v) => v.id === id)!, position: i }))
          )
        }
        onCreateView={() => setDialogOpen(true)}
      />

      <SavedViewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        onSave={async (data) => {
          setUserViews((prev) => [
            ...prev,
            { id: Date.now().toString(), ...data, position: prev.length },
          ]);
        }}
      />
    </div>
  );
}
