package handler_test

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
)

// TestSupersedeRequestParsing 測試 SupersedeRequest JSON 解析
func TestSupersedeRequestParsing(t *testing.T) {
	newID := uuid.New()
	jsonStr := `{"new_entry_id":"` + newID.String() + `"}`

	var req dto.SupersedeRequest
	if err := json.Unmarshal([]byte(jsonStr), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.NewEntryID != newID {
		t.Errorf("expected new_entry_id %s, got %s", newID, req.NewEntryID)
	}
}

// TestSupersedeRequestInvalidUUID 測試無效 UUID
func TestSupersedeRequestInvalidUUID(t *testing.T) {
	jsonStr := `{"new_entry_id":"not-a-uuid"}`

	var req dto.SupersedeRequest
	err := json.Unmarshal([]byte(jsonStr), &req)
	if err == nil {
		t.Error("expected error for invalid UUID, got nil")
	}
}

// TestSupersedeResponseSerialization 測試 SupersedeResponse 序列化
func TestSupersedeResponseSerialization(t *testing.T) {
	oldID := uuid.New()
	newID := uuid.New()

	resp := dto.SupersedeResponse{
		OldEntry: dto.SupersedeEntryInfo{
			ID:           oldID,
			SupersededBy: &newID,
			Confidence:   0.2,
		},
		NewEntry: dto.SupersedeEntryInfo{
			ID:         newID,
			Confidence: 0.8,
		},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to unmarshal result: %v", err)
	}

	oldEntry, ok := result["old_entry"].(map[string]interface{})
	if !ok {
		t.Fatal("old_entry not found in response")
	}

	if oldEntry["superseded_by"] == nil {
		t.Error("expected superseded_by to be set")
	}
}

// TestHistoryResponseSerialization 測試 HistoryResponse 序列化
func TestHistoryResponseSerialization(t *testing.T) {
	entryID := uuid.New()
	latestID := uuid.New()

	resp := dto.HistoryResponse{
		EntryID: entryID,
		Status:  "superseded",
		Chain:   []dto.HistoryChainItem{},
		Latest: dto.HistoryLatest{
			ID: latestID,
		},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to unmarshal result: %v", err)
	}

	if result["status"] != "superseded" {
		t.Errorf("expected status 'superseded', got '%v'", result["status"])
	}
}

// TestClearSupersedeResponseSerialization 測試 ClearSupersedeResponse 序列化
func TestClearSupersedeResponseSerialization(t *testing.T) {
	id := uuid.New()

	resp := dto.ClearSupersedeResponse{
		ID:           id,
		SupersededBy: nil,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to unmarshal result: %v", err)
	}

	if result["superseded_by"] != nil {
		t.Error("expected superseded_by to be null")
	}
}

// TestEntryResponseLifecycleStatus 測試 EntryResponse 包含 lifecycle_status
func TestEntryResponseLifecycleStatus(t *testing.T) {
	resp := dto.EntryResponse{
		ID:              uuid.New(),
		LifecycleStatus: "active",
		Confidence:      0.8,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to unmarshal result: %v", err)
	}

	if result["lifecycle_status"] != "active" {
		t.Errorf("expected lifecycle_status 'active', got '%v'", result["lifecycle_status"])
	}
}

// TestSearchResultItemLifecycleStatus 測試搜尋結果包含 lifecycle_status
func TestSearchResultItemLifecycleStatus(t *testing.T) {
	supersededID := uuid.New()
	item := dto.SearchResultItem{
		EntryID:         uuid.New(),
		LifecycleStatus: "superseded",
		SupersededBy:    &supersededID,
		Relevance:       0.05,
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to unmarshal result: %v", err)
	}

	if result["lifecycle_status"] != "superseded" {
		t.Errorf("expected lifecycle_status 'superseded', got '%v'", result["lifecycle_status"])
	}
	if result["superseded_by"] == nil {
		t.Error("expected superseded_by to be set")
	}
}
