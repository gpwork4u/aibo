package service

import (
	"context"
)

// SearchConfigResult 搜尋配置結果
type SearchConfigResult struct {
	FTSConfig      string
	Extensions     map[string]bool
	ChineseSupport string
}

// SystemService 系統資訊業務邏輯
type SystemService struct {
	repo SystemRepository
}

// NewSystemService 建立新的 SystemService
func NewSystemService(repo SystemRepository) *SystemService {
	return &SystemService{repo: repo}
}

// GetSearchConfig 取得搜尋配置資訊
func (s *SystemService) GetSearchConfig(ctx context.Context) (*SearchConfigResult, error) {
	pgTrgm, err := s.repo.ExtensionInstalled(ctx, "pg_trgm")
	if err != nil {
		return nil, err
	}

	pgBigm, err := s.repo.ExtensionInstalled(ctx, "pg_bigm")
	if err != nil {
		return nil, err
	}

	chineseSupport := "none"
	if pgBigm {
		chineseSupport = "pg_bigm (2-gram)"
	}

	return &SearchConfigResult{
		FTSConfig: "simple",
		Extensions: map[string]bool{
			"pg_trgm": pgTrgm,
			"pg_bigm": pgBigm,
		},
		ChineseSupport: chineseSupport,
	}, nil
}
