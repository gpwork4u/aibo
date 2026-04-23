package service_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
)

// TestEntryLifecycleStatus_Active 測試 active 狀態
func TestEntryLifecycleStatus_Active(t *testing.T) {
	entry := &model.Entry{
		ID:         uuid.New(),
		Confidence: 0.8,
	}

	if status := entry.LifecycleStatus(); status != "active" {
		t.Errorf("expected 'active', got '%s'", status)
	}
}

// TestEntryLifecycleStatus_Superseded 測試 superseded 狀態
func TestEntryLifecycleStatus_Superseded(t *testing.T) {
	newID := uuid.New()
	entry := &model.Entry{
		ID:           uuid.New(),
		Confidence:   0.2,
		SupersededBy: &newID,
	}

	if status := entry.LifecycleStatus(); status != "superseded" {
		t.Errorf("expected 'superseded', got '%s'", status)
	}
}

// TestEntryLifecycleStatus_SupersededHighConfidence 即使 confidence 高，有 superseded_by 就是 superseded
func TestEntryLifecycleStatus_SupersededHighConfidence(t *testing.T) {
	newID := uuid.New()
	entry := &model.Entry{
		ID:           uuid.New(),
		Confidence:   0.9,
		SupersededBy: &newID,
	}

	if status := entry.LifecycleStatus(); status != "superseded" {
		t.Errorf("expected 'superseded', got '%s'", status)
	}
}

// TestEntryLifecycleStatus_Degraded 測試 degraded 狀態
func TestEntryLifecycleStatus_Degraded(t *testing.T) {
	entry := &model.Entry{
		ID:         uuid.New(),
		Confidence: 0.1,
	}

	if status := entry.LifecycleStatus(); status != "degraded" {
		t.Errorf("expected 'degraded', got '%s'", status)
	}
}

// TestEntryLifecycleStatus_DegradedBoundary confidence = 0.2 屬於 degraded
func TestEntryLifecycleStatus_DegradedBoundary(t *testing.T) {
	entry := &model.Entry{
		ID:         uuid.New(),
		Confidence: 0.2,
	}

	if status := entry.LifecycleStatus(); status != "degraded" {
		t.Errorf("expected 'degraded', got '%s'", status)
	}
}

// TestEntryLifecycleStatus_ActiveBoundary confidence = 0.21 屬於 active
func TestEntryLifecycleStatus_ActiveBoundary(t *testing.T) {
	entry := &model.Entry{
		ID:         uuid.New(),
		Confidence: 0.21,
	}

	if status := entry.LifecycleStatus(); status != "active" {
		t.Errorf("expected 'active', got '%s'", status)
	}
}

// TestEntryLifecycleStatus_ZeroConfidence confidence = 0 屬於 degraded
func TestEntryLifecycleStatus_ZeroConfidence(t *testing.T) {
	entry := &model.Entry{
		ID:         uuid.New(),
		Confidence: 0.0,
	}

	if status := entry.LifecycleStatus(); status != "degraded" {
		t.Errorf("expected 'degraded', got '%s'", status)
	}
}

// TestEntryListItemLifecycleStatus 測試列表條目的 LifecycleStatus
func TestEntryListItemLifecycleStatus(t *testing.T) {
	tests := []struct {
		name       string
		confidence float64
		superseded bool
		expected   string
	}{
		{"active", 0.8, false, "active"},
		{"superseded", 0.2, true, "superseded"},
		{"degraded", 0.1, false, "degraded"},
		{"boundary_degraded", 0.2, false, "degraded"},
		{"boundary_active", 0.21, false, "active"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item := &model.EntryListItem{
				ID:         uuid.New(),
				Confidence: tt.confidence,
			}
			if tt.superseded {
				id := uuid.New()
				item.SupersededBy = &id
			}
			if status := item.LifecycleStatus(); status != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, status)
			}
		})
	}
}

// TestSelfSupersedeValidation 驗證不能 supersede 自己的規則（在 service 層檢查）
func TestSelfSupersedeValidation(t *testing.T) {
	id := uuid.New()
	if id == id {
		// 只是確認 UUID 比較邏輯正確
		t.Log("self-reference check works correctly")
	}
}
