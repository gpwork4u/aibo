package dto

import (
	"time"

	"github.com/google/uuid"
)

// CalendarEntrySummary 行事曆單日內的 entry 精簡表示
//
// 用於 GET /api/v1/calendar 與 GET /api/v1/calendar/days/:date 的 entry 區塊。
// Date 欄位僅用於 service 內部分桶（依 X-Timezone 計算），不對外序列化。
type CalendarEntrySummary struct {
	ID         uuid.UUID `json:"id"`
	Title      *string   `json:"title"`
	Summary    *string   `json:"summary"`
	SourceType *string   `json:"source_type"`
	Tags       []string  `json:"tags"`
	CreatedAt  time.Time `json:"created_at"`
	Date       string    `json:"-"` // YYYY-MM-DD，依請求 timezone 計算
}

// CalendarEventSummary 行事曆單日內的 Google Calendar event 表示
//
// 對應 spec §Data Model：不落 DB，read-through 從 gcal API 拿。
// LinkedEntryID：若該 event 已被轉成 entry（source_type='gcal' 且 source_ref=gcal_id），
// 則帶入該 entry id；否則為 nil。
type CalendarEventSummary struct {
	GcalID        string     `json:"gcal_id"`
	Summary       string     `json:"summary"`
	Start         time.Time  `json:"start"`
	End           time.Time  `json:"end"`
	AllDay        bool       `json:"all_day"`
	LinkedEntryID *uuid.UUID `json:"linked_entry_id"`
	Location      *string    `json:"location,omitempty"`
	Description   *string    `json:"description,omitempty"`
}

// CalendarJournal 行事曆單日日記摘要
//
// 嵌入在 CalendarDay.Journal 欄位；只帶 UI 所需最少資訊，
// 完整內容透過 GET /api/v1/journal/:date 取得。
type CalendarJournal struct {
	ID          string  `json:"id"`
	Content     string  `json:"content"`
	Mood        *string `json:"mood,omitempty"`
	GeneratedBy *string `json:"generated_by,omitempty"`
}

// CalendarDay 單日彙整
//
// 對應 spec §API Contract 的 response.days[*]。
// Journal 欄位在有日記時填入，無日記時為 nil（omitempty）。
type CalendarDay struct {
	Date       string                 `json:"date"`
	EntryCount int                    `json:"entry_count"`
	EventCount int                    `json:"event_count"`
	HasJournal bool                   `json:"has_journal"`
	Entries    []CalendarEntrySummary `json:"entries"`
	Events     []CalendarEventSummary `json:"events"`
	Journal    *CalendarJournal       `json:"journal,omitempty"`
}

// ToEntryRequest POST /api/v1/calendar/events/:gcal_id/to-entry 的請求 body
//
// 所有欄位皆為選填：
//   - CalendarID：預設 "primary"
//   - TitleOverride：若提供則覆蓋預設標題（"[GCal] " + summary）
//   - ContentOverride：若提供則覆蓋預設內容（time/location/description 組合）
type ToEntryRequest struct {
	CalendarID      *string `json:"calendar_id"`
	TitleOverride   *string `json:"title_override"`
	ContentOverride *string `json:"content_override"`
}

// CalendarResponse GET /api/v1/calendar 的主回應
type CalendarResponse struct {
	Since string        `json:"since"`
	Until string        `json:"until"`
	Days  []CalendarDay `json:"days"`
}
