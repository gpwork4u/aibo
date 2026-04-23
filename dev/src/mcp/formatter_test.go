package mcp_test

import (
	"strings"
	"testing"

	aimcp "github.com/gpwork4u/aibo/mcp"
)

func strPtr(s string) *string {
	return &s
}

func TestFormatSearchResults_Empty(t *testing.T) {
	result := aimcp.FormatSearchResults(nil, 0)
	if result != "知識庫中未找到相關條目。" {
		t.Errorf("期望空結果提示，得到: %s", result)
	}
}

func TestFormatSearchResults_WithResults(t *testing.T) {
	items := []aimcp.SearchResultItem{
		{
			EntryID:        "abc-123",
			Title:          strPtr("Go 錯誤處理"),
			Summary:        strPtr("Go 使用 error interface 進行錯誤處理"),
			ContentPreview: "Go 使用 error interface...",
			Tags:           []string{"golang", "error"},
			Relevance:      0.85,
		},
		{
			EntryID:        "def-456",
			Title:          nil,
			Summary:        nil,
			ContentPreview: "一些內容預覽",
			Tags:           nil,
			Relevance:      0.60,
		},
	}

	result := aimcp.FormatSearchResults(items, 2)

	// 檢查基本結構
	if !strings.Contains(result, "找到 2 筆相關知識") {
		t.Error("缺少總數資訊")
	}
	if !strings.Contains(result, "ID: abc-123") {
		t.Error("缺少第一筆 entry ID")
	}
	if !strings.Contains(result, "標題: Go 錯誤處理") {
		t.Error("缺少標題")
	}
	if !strings.Contains(result, "摘要: Go 使用 error interface 進行錯誤處理") {
		t.Error("缺少摘要")
	}
	if !strings.Contains(result, "golang, error") {
		t.Error("缺少標籤")
	}
	if !strings.Contains(result, "85%") {
		t.Error("缺少相關度")
	}
	// 第二筆無 title/summary，應顯示 content preview
	if !strings.Contains(result, "內容: 一些內容預覽") {
		t.Error("缺少 content preview fallback")
	}
}

func TestFormatEntryCreated(t *testing.T) {
	entry := &aimcp.EntryResponse{
		ID:    "new-entry-id",
		Title: strPtr("新知識"),
	}

	result := aimcp.FormatEntryCreated(entry)
	if !strings.Contains(result, "已成功建立知識條目") {
		t.Error("缺少成功訊息")
	}
	if !strings.Contains(result, "new-entry-id") {
		t.Error("缺少 entry ID")
	}
	if !strings.Contains(result, "新知識") {
		t.Error("缺少標題")
	}
}

func TestFormatConfirmResult(t *testing.T) {
	result := aimcp.FormatConfirmResult(&aimcp.ConfirmResponse{
		EntryID:       "test-id",
		Confidence:    0.85,
		Confirmations: 3,
	})
	if !strings.Contains(result, "test-id") {
		t.Error("缺少 entry ID")
	}
	if !strings.Contains(result, "85%") {
		t.Error("缺少信心度")
	}
	if !strings.Contains(result, "3") {
		t.Error("缺少確認次數")
	}
}

func TestFormatFlagResult(t *testing.T) {
	result := aimcp.FormatFlagResult(&aimcp.FlagResponse{
		EntryID:    "test-id",
		Confidence: 0.50,
		FlagsCount: 2,
	})
	if !strings.Contains(result, "test-id") {
		t.Error("缺少 entry ID")
	}
	if !strings.Contains(result, "50%") {
		t.Error("缺少信心度")
	}
}

func TestFormatStats(t *testing.T) {
	stats := &aimcp.StatsResponse{
		TotalEntries:    150,
		TotalCategories: 12,
		AvgConfidence:   0.72,
		EntriesByCategory: []aimcp.CategoryCountItem{
			{Category: "golang", Count: 30},
			{Category: "devops", Count: 25},
		},
		RecentEntries: []aimcp.RecentEntryItem{
			{ID: "entry-1", Title: "Go 入門", CreatedAt: "2026-04-20T10:00:00Z"},
			{ID: "entry-2", Title: "", CreatedAt: "2026-04-19T09:00:00Z"},
		},
	}

	result := aimcp.FormatStats(stats)
	if !strings.Contains(result, "150") {
		t.Error("缺少條目總數")
	}
	if !strings.Contains(result, "12") {
		t.Error("缺少分類總數")
	}
	if !strings.Contains(result, "72%") {
		t.Error("缺少平均信心度")
	}
	if !strings.Contains(result, "golang: 30 筆") {
		t.Error("缺少分類分布")
	}
	if !strings.Contains(result, "devops: 25 筆") {
		t.Error("缺少分類分布")
	}
	if !strings.Contains(result, "最近條目") {
		t.Error("缺少最近條目區塊")
	}
	if !strings.Contains(result, "entry-1") {
		t.Error("缺少最近條目 ID")
	}
	if !strings.Contains(result, "Go 入門") {
		t.Error("缺少最近條目標題")
	}
	if !strings.Contains(result, "(無標題)") {
		t.Error("空標題應顯示 (無標題)")
	}
}

func TestFormatSearchResults_WithDetailAndAction(t *testing.T) {
	detail := "詳細的錯誤處理說明"
	action := "使用 errors.Is 進行比較"
	items := []aimcp.SearchResultItem{
		{
			EntryID:        "abc-123",
			Title:          strPtr("Go 錯誤處理"),
			Summary:        strPtr("Go 使用 error interface 進行錯誤處理"),
			Detail:         &detail,
			Action:         &action,
			ContentPreview: "Go 使用 error interface...",
			Tags:           []string{"golang"},
			Relevance:      0.85,
		},
		{
			EntryID:        "def-456",
			Title:          strPtr("基本知識"),
			Summary:        strPtr("簡單摘要"),
			Detail:         nil,
			Action:         nil,
			ContentPreview: "內容",
			Tags:           nil,
			Relevance:      0.60,
		},
	}

	result := aimcp.FormatSearchResults(items, 2)

	if !strings.Contains(result, "詳情: 詳細的錯誤處理說明") {
		t.Error("缺少 detail 欄位")
	}
	if !strings.Contains(result, "行動: 使用 errors.Is 進行比較") {
		t.Error("缺少 action 欄位")
	}
	// 第二筆沒有 detail/action，不應出現
	parts := strings.Split(result, "--- [2] ---")
	if len(parts) > 1 && strings.Contains(parts[1], "詳情:") {
		t.Error("空 detail 不應顯示")
	}
}
