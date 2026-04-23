package mcp

import (
	"fmt"
	"strings"
)

// FormatSearchResults 格式化搜尋結果為 LLM 友好的文字
func FormatSearchResults(results []SearchResultItem, total int) string {
	if total == 0 || len(results) == 0 {
		return "知識庫中未找到相關條目。"
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("找到 %d 筆相關知識：\n\n", total))

	for i, r := range results {
		sb.WriteString(fmt.Sprintf("--- [%d] ---\n", i+1))

		// entry_id
		sb.WriteString(fmt.Sprintf("ID: %s\n", r.EntryID))

		// title
		if r.Title != nil && *r.Title != "" {
			sb.WriteString(fmt.Sprintf("標題: %s\n", *r.Title))
		}

		// summary（優先顯示）
		if r.Summary != nil && *r.Summary != "" {
			sb.WriteString(fmt.Sprintf("摘要: %s\n", *r.Summary))
		} else if r.ContentPreview != "" {
			sb.WriteString(fmt.Sprintf("內容: %s\n", r.ContentPreview))
		}

		// detail（如有）
		if r.Detail != nil && *r.Detail != "" {
			sb.WriteString(fmt.Sprintf("詳情: %s\n", *r.Detail))
		}

		// action（如有）
		if r.Action != nil && *r.Action != "" {
			sb.WriteString(fmt.Sprintf("行動: %s\n", *r.Action))
		}

		// tags
		if len(r.Tags) > 0 {
			sb.WriteString(fmt.Sprintf("標籤: %s\n", strings.Join(r.Tags, ", ")))
		}

		// relevance
		sb.WriteString(fmt.Sprintf("相關度: %.0f%%\n", r.Relevance*100))

		sb.WriteString("\n")
	}

	return sb.String()
}

// FormatEntryCreated 格式化建立結果
func FormatEntryCreated(entry *EntryResponse) string {
	var sb strings.Builder
	sb.WriteString("已成功建立知識條目。\n")
	sb.WriteString(fmt.Sprintf("ID: %s\n", entry.ID))
	if entry.Title != nil && *entry.Title != "" {
		sb.WriteString(fmt.Sprintf("標題: %s\n", *entry.Title))
	}
	return sb.String()
}

// FormatConfirmResult 格式化確認結果
func FormatConfirmResult(result *ConfirmResponse) string {
	return fmt.Sprintf("已確認知識條目 %s。\n信心度: %.0f%%\n確認次數: %d",
		result.EntryID, result.Confidence*100, result.Confirmations)
}

// FormatFlagResult 格式化標記結果
func FormatFlagResult(result *FlagResponse) string {
	return fmt.Sprintf("已標記知識條目 %s。\n信心度: %.0f%%\n標記次數: %d",
		result.EntryID, result.Confidence*100, result.FlagsCount)
}

// FormatStats 格式化統計資訊
func FormatStats(stats *StatsResponse) string {
	var sb strings.Builder
	sb.WriteString("=== aibo 知識庫統計 ===\n\n")
	sb.WriteString(fmt.Sprintf("條目總數: %d\n", stats.TotalEntries))
	sb.WriteString(fmt.Sprintf("分類總數: %d\n", stats.TotalCategories))
	sb.WriteString(fmt.Sprintf("平均信心度: %.0f%%\n", stats.AvgConfidence*100))

	if len(stats.EntriesByCategory) > 0 {
		sb.WriteString("\n分類分布:\n")
		for _, cat := range stats.EntriesByCategory {
			sb.WriteString(fmt.Sprintf("  - %s: %d 筆\n", cat.Category, cat.Count))
		}
	}

	if len(stats.RecentEntries) > 0 {
		sb.WriteString("\n最近條目:\n")
		for _, re := range stats.RecentEntries {
			title := re.Title
			if title == "" {
				title = "(無標題)"
			}
			sb.WriteString(fmt.Sprintf("  - [%s] %s (%s)\n", re.ID, title, re.CreatedAt))
		}
	}

	return sb.String()
}
