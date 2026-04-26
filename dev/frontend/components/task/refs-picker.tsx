"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiClient } from "@/lib/api/client";
import type { TaskRef } from "@/lib/api/tasks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RefKind = TaskRef["ref_type"];

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface RefsPickerProps {
  /** Current refs on the task (for dedup). */
  value: TaskRef[];
  /** Called when user selects an item from the result list. */
  onSelect: (ref: TaskRef) => void;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

interface EntryItem {
  id: string;
  title: string;
  summary?: string | null;
}

interface JournalItem {
  id: string;
  date: string;
  title?: string | null;
}

interface GcalEventItem {
  id: string;
  summary: string;
  start?: string;
}

async function searchEntries(q: string): Promise<SearchResultItem[]> {
  const params = new URLSearchParams({ q });
  const res = await apiClient.get<{ data: EntryItem[] }>(
    `/api/v1/entries?${params.toString()}`,
  );
  return (res.data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    subtitle: e.summary ?? undefined,
  }));
}

async function listJournal(
  dateFrom: string,
  dateTo: string,
): Promise<SearchResultItem[]> {
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
  const res = await apiClient.get<{ data: JournalItem[] }>(
    `/api/v1/journal?${params.toString()}`,
  );
  return (res.data ?? []).map((j) => ({
    id: j.id,
    title: j.title ?? j.date,
    subtitle: j.date,
  }));
}

async function listGcalEvents(
  since: string,
  until: string,
): Promise<SearchResultItem[]> {
  const params = new URLSearchParams({ since, until });
  const res = await apiClient.get<{ data: GcalEventItem[] }>(
    `/api/v1/gcal/events?${params.toString()}`,
  );
  return (res.data ?? []).map((e) => ({
    id: e.id,
    title: e.summary,
    subtitle: e.start,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

interface TabContentProps {
  value: TaskRef[];
  onSelect: (ref: TaskRef) => void;
}

function EntryTabContent({ value, onSelect }: TabContentProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = React.useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchEntries(q)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 300);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="搜尋條目關鍵字…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        data-testid="refs-picker-search-input"
      />
      <ResultList
        results={results}
        loading={loading}
        empty={!query.trim()}
        refType="entry"
        value={value}
        onSelect={onSelect}
      />
    </div>
  );
}

function JournalTabContent({ value, onSelect }: TabContentProps) {
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load journal on mount (last 90 days)
  React.useEffect(() => {
    setLoading(true);
    listJournal(daysAgo(90), isoDate(new Date()))
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!v.trim()) {
        listJournal(daysAgo(90), isoDate(new Date()))
          .then(setResults)
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
      } else {
        // Filter locally by title/date
        const lower = v.toLowerCase();
        setResults((prev) =>
          prev.filter(
            (r) =>
              r.title.toLowerCase().includes(lower) ||
              (r.subtitle ?? "").toLowerCase().includes(lower),
          ),
        );
      }
    }, 300);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="篩選日記…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        data-testid="refs-picker-search-input"
      />
      <ResultList
        results={results}
        loading={loading}
        empty={false}
        alwaysShowList={true}
        refType="journal"
        value={value}
        onSelect={onSelect}
      />
    </div>
  );
}

function GcalTabContent({ value, onSelect }: TabContentProps) {
  const [date, setDate] = React.useState(isoDate(new Date()));
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const loadEvents = React.useCallback((d: string) => {
    setLoading(true);
    listGcalEvents(d, d)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadEvents(date);
  }, [date, loadEvents]);

  return (
    <div className="space-y-2">
      <Input
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          setQuery("");
        }}
        data-testid="refs-picker-gcal-date-input"
      />
      <Input
        placeholder="搜尋 Google Calendar 事件…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="refs-picker-search-input"
      />
      <ResultList
        results={
          query.trim()
            ? results.filter((r) =>
                r.title.toLowerCase().includes(query.toLowerCase()),
              )
            : results
        }
        loading={loading}
        empty={false}
        alwaysShowList={true}
        refType="gcal_event"
        value={value}
        onSelect={onSelect}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared result list
// ---------------------------------------------------------------------------

interface ResultListProps {
  results: SearchResultItem[];
  loading: boolean;
  /** When true, shows "enter keyword" prompt instead of list */
  empty: boolean;
  /** When true, always shows the list container (even if empty) */
  alwaysShowList?: boolean;
  refType: RefKind;
  value: TaskRef[];
  onSelect: (ref: TaskRef) => void;
}

function ResultList({
  results,
  loading,
  empty,
  alwaysShowList = false,
  refType,
  value,
  onSelect,
}: ResultListProps) {
  if (loading) {
    return (
      <ul
        className="max-h-48 overflow-y-auto divide-y divide-border rounded-md border"
        data-testid="refs-picker-result-list"
      >
        <li className="py-4 text-center text-xs text-muted-foreground">
          載入中…
        </li>
      </ul>
    );
  }
  if (empty && !alwaysShowList) {
    return (
      <p
        className="py-4 text-center text-xs text-muted-foreground"
        data-testid="refs-picker-empty"
      >
        請輸入關鍵字搜尋
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <ul
        className="max-h-48 overflow-y-auto divide-y divide-border rounded-md border"
        data-testid="refs-picker-result-list"
      >
        <li
          className="py-4 text-center text-xs text-muted-foreground"
          data-testid="refs-picker-empty"
        >
          {empty ? "暫無資料" : "找不到結果"}
        </li>
      </ul>
    );
  }

  return (
    <ul
      className="max-h-48 overflow-y-auto divide-y divide-border rounded-md border"
      data-testid="refs-picker-result-list"
    >
      {results.map((item) => {
        const alreadyAdded = value.some(
          (r) => r.ref_type === refType && r.ref_id === item.id,
        );
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={alreadyAdded}
              onClick={() =>
                onSelect({
                  ref_type: refType,
                  ref_id: item.id,
                  title: item.title,
                })
              }
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid={`refs-picker-result-item-${item.id}`}
            >
              <span className="font-medium">{item.title}</span>
              {item.subtitle && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.subtitle}
                </span>
              )}
              {alreadyAdded && (
                <span className="ml-2 text-xs text-muted-foreground">
                  （已加入）
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main RefsPicker
// ---------------------------------------------------------------------------

/**
 * RefsPicker — F-033g 完整搜尋 UI。
 *
 * 以 Popover 形式呈現，內含三個 tab：Entry / Journal / Gcal。
 * 點選結果項目後立即呼叫 onSelect callback。
 */
export function RefsPicker({ value, onSelect }: RefsPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<RefKind>("entry");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="refs-picker"
        >
          <Search className="mr-1 h-3.5 w-3.5" />
          新增關聯來源
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="start">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as RefKind)}
        >
          <TabsList className="w-full">
            <TabsTrigger
              value="entry"
              className="flex-1"
              data-testid="refs-picker-tab-entry"
            >
              條目
            </TabsTrigger>
            <TabsTrigger
              value="journal"
              className="flex-1"
              data-testid="refs-picker-tab-journal"
            >
              日記
            </TabsTrigger>
            <TabsTrigger
              value="gcal_event"
              className="flex-1"
              data-testid="refs-picker-tab-gcal"
            >
              行事曆
            </TabsTrigger>
          </TabsList>

          <div className="mt-3">
            <TabsContent value="entry" className="m-0">
              <EntryTabContent value={value} onSelect={onSelect} />
            </TabsContent>
            <TabsContent value="journal" className="m-0">
              <JournalTabContent value={value} onSelect={onSelect} />
            </TabsContent>
            <TabsContent value="gcal_event" className="m-0">
              <GcalTabContent value={value} onSelect={onSelect} />
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
