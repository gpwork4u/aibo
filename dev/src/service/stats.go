package service

import (
	"context"
)

// StatsResult 統計結果
type StatsResult struct {
	TotalEntries      int
	TotalCategories   int
	EntriesByCategory []CategoryCountResult
	AvgConfidence     float64
	RecentEntries     []RecentEntryResult
}

// CategoryCountResult 分類計數結果
type CategoryCountResult struct {
	Category string
	Count    int
}

// RecentEntryResult 最近條目結果
type RecentEntryResult struct {
	ID        string
	Title     string
	CreatedAt string
}

// StatsService 統計業務邏輯
type StatsService struct {
	repo StatsRepository
}

// NewStatsService 建立新的 StatsService
func NewStatsService(repo StatsRepository) *StatsService {
	return &StatsService{repo: repo}
}

// GetStats 取得知識庫統計
func (s *StatsService) GetStats(ctx context.Context) (*StatsResult, error) {
	totalEntries, err := s.repo.GetTotalEntries(ctx)
	if err != nil {
		return nil, err
	}

	totalCategories, err := s.repo.GetTotalCategories(ctx)
	if err != nil {
		return nil, err
	}

	categoryCounts, err := s.repo.GetEntriesByCategory(ctx)
	if err != nil {
		return nil, err
	}

	avgConfidence, err := s.repo.GetAvgConfidence(ctx)
	if err != nil {
		return nil, err
	}

	recentEntries, err := s.repo.GetRecentEntries(ctx)
	if err != nil {
		return nil, err
	}

	recent := make([]RecentEntryResult, 0, len(recentEntries))
	for _, re := range recentEntries {
		recent = append(recent, RecentEntryResult{
			ID:        re.ID,
			Title:     re.Title,
			CreatedAt: re.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	byCategory := make([]CategoryCountResult, 0, len(categoryCounts))
	for _, cc := range categoryCounts {
		byCategory = append(byCategory, CategoryCountResult{
			Category: cc.CategoryName,
			Count:    cc.Count,
		})
	}

	return &StatsResult{
		TotalEntries:      totalEntries,
		TotalCategories:   totalCategories,
		EntriesByCategory: byCategory,
		AvgConfidence:     avgConfidence,
		RecentEntries:     recent,
	}, nil
}
