package service

import (
	"context"

	"github.com/gpwork4u/aibo/repository"
)

// StatsResult 統計結果
type StatsResult struct {
	TotalEntries      int
	TotalCategories   int
	EntriesByCategory []CategoryCountResult
	AvgConfidence     float64
}

// CategoryCountResult 分類計數結果
type CategoryCountResult struct {
	Category string
	Count    int
}

// StatsService 統計業務邏輯
type StatsService struct {
	repo *repository.StatsRepository
}

// NewStatsService 建立新的 StatsService
func NewStatsService(repo *repository.StatsRepository) *StatsService {
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
	}, nil
}
