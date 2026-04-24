package dto

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// TestCalendarEntrySummaryJSONTags 驗證 DTO 的 JSON tag 與 spec 完全一致，
// 特別是 Date 欄位必須以 "-" 標記，不對外序列化（僅供 service 內部分桶）。
func TestCalendarEntrySummaryJSONTags(t *testing.T) {
	id := uuid.New()
	title := "測試條目"
	summary := "摘要"
	sourceType := "manual"
	createdAt := time.Date(2026, 4, 24, 9, 11, 0, 0, time.UTC)

	item := CalendarEntrySummary{
		ID:         id,
		Title:      &title,
		Summary:    &summary,
		SourceType: &sourceType,
		Tags:       []string{"golang"},
		CreatedAt:  createdAt,
		Date:       "2026-04-24",
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	for _, k := range []string{"id", "title", "summary", "source_type", "tags", "created_at"} {
		if _, ok := parsed[k]; !ok {
			t.Errorf("missing key %q in JSON: %s", k, string(data))
		}
	}
	// Date 不應出現於 JSON（tag 為 "-"）
	if _, ok := parsed["date"]; ok {
		t.Errorf("expected no 'date' key (internal), got: %s", string(data))
	}
	if _, ok := parsed["Date"]; ok {
		t.Errorf("expected no 'Date' key, got: %s", string(data))
	}
}

// TestCalendarEventSummaryJSONTags 驗證 gcal event DTO 的 JSON tag。
func TestCalendarEventSummaryJSONTags(t *testing.T) {
	linked := uuid.New()
	ev := CalendarEventSummary{
		GcalID:        "abc123",
		Summary:       "Standup",
		Start:         time.Date(2026, 4, 24, 9, 0, 0, 0, time.UTC),
		End:           time.Date(2026, 4, 24, 9, 30, 0, 0, time.UTC),
		AllDay:        false,
		LinkedEntryID: &linked,
	}
	data, err := json.Marshal(ev)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var parsed map[string]interface{}
	_ = json.Unmarshal(data, &parsed)

	for _, k := range []string{"gcal_id", "summary", "start", "end", "all_day", "linked_entry_id"} {
		if _, ok := parsed[k]; !ok {
			t.Errorf("missing key %q: %s", k, string(data))
		}
	}
	// location / description 為 omitempty，未設值時應不出現
	if _, ok := parsed["location"]; ok {
		t.Errorf("expected 'location' omitted when nil, got: %s", string(data))
	}
	if _, ok := parsed["description"]; ok {
		t.Errorf("expected 'description' omitted when nil, got: %s", string(data))
	}
}

// TestCalendarEventSummary_OptionalFieldsPresent 驗證設了 location/description 會出現。
func TestCalendarEventSummary_OptionalFieldsPresent(t *testing.T) {
	loc := "台北"
	desc := "說明"
	ev := CalendarEventSummary{
		GcalID:      "abc",
		Summary:     "x",
		Start:       time.Now(),
		End:         time.Now(),
		Location:    &loc,
		Description: &desc,
	}
	data, _ := json.Marshal(ev)
	var parsed map[string]interface{}
	_ = json.Unmarshal(data, &parsed)
	if parsed["location"] != "台北" {
		t.Errorf("expected location=台北, got %v", parsed["location"])
	}
	if parsed["description"] != "說明" {
		t.Errorf("expected description=說明, got %v", parsed["description"])
	}
}

// TestCalendarDayJSONTags 驗證 CalendarDay 的 JSON tag。
func TestCalendarDayJSONTags(t *testing.T) {
	day := CalendarDay{
		Date:       "2026-04-24",
		EntryCount: 3,
		EventCount: 2,
		HasJournal: true,
		Entries:    []CalendarEntrySummary{},
		Events:     []CalendarEventSummary{},
	}
	data, err := json.Marshal(day)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var parsed map[string]interface{}
	_ = json.Unmarshal(data, &parsed)

	for _, k := range []string{"date", "entry_count", "event_count", "has_journal", "entries", "events"} {
		if _, ok := parsed[k]; !ok {
			t.Errorf("missing key %q: %s", k, string(data))
		}
	}
}

// TestCalendarResponseJSONTags 驗證主 response 結構。
func TestCalendarResponseJSONTags(t *testing.T) {
	resp := CalendarResponse{
		Since: "2026-04-01",
		Until: "2026-04-30",
		Days:  []CalendarDay{},
	}
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var parsed map[string]interface{}
	_ = json.Unmarshal(data, &parsed)
	for _, k := range []string{"since", "until", "days"} {
		if _, ok := parsed[k]; !ok {
			t.Errorf("missing key %q: %s", k, string(data))
		}
	}
}
