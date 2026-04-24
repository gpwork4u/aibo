"use client";

import * as React from "react";
import { FolderInput, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories, useUpdateEntry } from "@/lib/hooks/use-entries";

interface MoveToCategoryPopoverProps {
  entryId: string;
  /** Trigger element; 若未提供則使用預設 ghost button */
  children?: React.ReactNode;
}

export function MoveToCategoryPopover({ entryId, children }: MoveToCategoryPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const { data: categories = [] } = useCategories();
  const updateMut = useUpdateEntry();

  const handleMove = async (categoryId: string, name: string) => {
    try {
      await updateMut.mutateAsync({ id: entryId, payload: { category_id: categoryId } });
      toast.success(`已移至「${name}」`);
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "移動失敗";
      toast.error(msg);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="sm" data-testid="move-to-category-button">
            <FolderInput className="mr-2 h-4 w-4" />
            移至分類
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-2"
        align="end"
        data-testid="move-to-category-popover"
      >
        <div className="space-y-1">
          {categories.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              尚未建立分類
            </p>
          ) : (
            categories.map((cat) => (
              <Button
                key={cat.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleMove(cat.id, cat.name)}
                disabled={updateMut.isPending}
                data-testid={`category-option-${cat.id}`}
              >
                <FolderTree className="mr-2 h-4 w-4" />
                <span className="truncate">{cat.name}</span>
              </Button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
