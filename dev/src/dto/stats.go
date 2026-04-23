package dto

// StatsResponse 知識庫統計回應
type StatsResponse struct {
	TotalEntries      int                 `json:"total_entries"`
	TotalCategories   int                 `json:"total_categories"`
	EntriesByCategory []CategoryCountItem `json:"entries_by_category"`
	AvgConfidence     float64             `json:"avg_confidence"`
	RecentEntries     []RecentEntryItem   `json:"recent_entries"`
}

// RecentEntryItem 最近條目項目
type RecentEntryItem struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
}

// CategoryCountItem 分類計數項目
type CategoryCountItem struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}
