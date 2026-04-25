"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { TaskRef } from "@/lib/api/tasks";
import { PROJECTS_TESTIDS } from "@/lib/projects/testids";

type RefKind = TaskRef["ref_type"];

interface RefsPickerProps {
  value: TaskRef[];
  onChange: (next: TaskRef[]) => void;
}

/**
 * RefsPicker：F-032c 基礎版本。
 *
 * 提供 Entry / Journal / Gcal 三個 tab，搜尋輸入框與已選 chips 區塊。
 * 搜尋實際串接後端會在後續 PR 完成；本版本以「直接輸入 ID + label」方式新增 ref，
 * 確保資料流（onChange）正確並不阻擋 TaskSheet 整合。
 */
export function RefsPicker({ value, onChange }: RefsPickerProps) {
  const [kind, setKind] = React.useState<RefKind>("entry");
  const [refId, setRefId] = React.useState("");

  const handleAdd = () => {
    const id = refId.trim();
    if (!id) return;
    if (value.some((r) => r.ref_type === kind && r.ref_id === id)) return;
    onChange([...value, { ref_type: kind, ref_id: id }]);
    setRefId("");
  };

  const handleRemove = (target: TaskRef) => {
    onChange(
      value.filter(
        (r) => !(r.ref_type === target.ref_type && r.ref_id === target.ref_id),
      ),
    );
  };

  return (
    <div className="space-y-3" data-testid={PROJECTS_TESTIDS.refsPicker}>
      <Tabs value={kind} onValueChange={(v) => setKind(v as RefKind)}>
        <TabsList>
          <TabsTrigger
            value="entry"
            data-testid={PROJECTS_TESTIDS.refsPickerTab("entry")}
          >
            知識條目
          </TabsTrigger>
          <TabsTrigger
            value="journal"
            data-testid={PROJECTS_TESTIDS.refsPickerTab("journal")}
          >
            日記
          </TabsTrigger>
          <TabsTrigger
            value="gcal_event"
            data-testid={PROJECTS_TESTIDS.refsPickerTab("gcal")}
          >
            Google Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value={kind} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              placeholder={
                kind === "entry"
                  ? "輸入條目 ID 或關鍵字"
                  : kind === "journal"
                    ? "輸入日記日期 (YYYY-MM-DD)"
                    : "輸入 Google Calendar 事件 ID"
              }
              data-testid={PROJECTS_TESTIDS.refsPickerSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button type="button" onClick={handleAdd}>
              新增
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            （搜尋串接後端的版本將於後續 PR 上線；目前可直接輸入 ID 建立關聯。）
          </p>
        </TabsContent>
      </Tabs>

      {value.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground"
          data-testid={PROJECTS_TESTIDS.refsPickerEmpty}
        >
          尚未關聯任何來源
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((r) => (
            <Badge
              key={`${r.ref_type}:${r.ref_id}`}
              variant="secondary"
              className="gap-1 pr-1"
              data-testid={PROJECTS_TESTIDS.refsPickerChip(r.ref_id)}
            >
              <span className="font-medium uppercase opacity-70">{r.ref_type}</span>
              <span className="truncate max-w-[140px]">{r.ref_id}</span>
              <button
                type="button"
                aria-label="移除來源"
                className="ml-1 rounded p-0.5 hover:bg-muted"
                onClick={() => handleRemove(r)}
                data-testid={PROJECTS_TESTIDS.refsPickerChipRemove(r.ref_id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
