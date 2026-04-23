package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// SearchService 搜尋業務邏輯
type SearchService struct {
	llmSvc     *LlmService
	searchRepo *repository.SearchRepository
}

// NewSearchService 建立新的 SearchService
func NewSearchService(llmSvc *LlmService, searchRepo *repository.SearchRepository) *SearchService {
	return &SearchService{
		llmSvc:     llmSvc,
		searchRepo: searchRepo,
	}
}

// SmartSearchInput 智慧搜尋輸入
type SmartSearchInput struct {
	Query         string
	CategoryID    *uuid.UUID
	Domains       []string
	ContextFilter map[string][]string
	Limit         int
}

// SmartSearchOutput 智慧搜尋輸出
type SmartSearchOutput struct {
	Results      []SearchResultOutput
	SynonymsUsed []string
	Total        int
	Degraded     bool
}

// SearchResultOutput 搜尋結果輸出
type SearchResultOutput struct {
	EntryID         uuid.UUID
	Title           *string
	Summary         *string
	ContentPreview  string
	Tags            []string
	Domains         []string
	Context         *json.RawMessage
	LifecycleStatus string
	SupersededBy    *uuid.UUID
	Relevance       float64
	MatchedKeywords []string
}

// SimpleSearchInput 簡單搜尋輸入
type SimpleSearchInput struct {
	Query         string
	CategoryID    *uuid.UUID
	Tags          []string
	Domains       []string
	ContextFilter map[string][]string
	Limit         int
	Offset        int
}

// SimpleSearchOutput 簡單搜尋輸出
type SimpleSearchOutput struct {
	Results  []SimpleSearchResultOutput
	Total    int
	Degraded bool
}

// SimpleSearchResultOutput 簡單搜尋結果輸出
type SimpleSearchResultOutput struct {
	EntryID         uuid.UUID
	Title           *string
	Summary         *string
	ContentPreview  string
	Tags            []string
	Domains         []string
	Context         *json.RawMessage
	LifecycleStatus string
	SupersededBy    *uuid.UUID
	Relevance       float64
}

// SmartSearch 智慧搜尋：LLM 展開同義詞 + 加權全文搜尋
func (s *SearchService) SmartSearch(ctx context.Context, input SmartSearchInput) (*SmartSearchOutput, error) {
	// 驗證輸入
	if err := validateSearchQuery(input.Query); err != nil {
		return nil, err
	}
	if input.Limit < 1 || input.Limit > 50 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "limit 必須為 1-50 的整數")
	}

	// 嘗試 LLM 展開同義詞
	synonyms, err := s.llmSvc.ExpandSynonyms(ctx, input.Query)

	degraded := false
	var keywords []string

	if err != nil {
		// LLM 失敗，降級為原始 query 搜尋
		slog.Warn("LLM 同義詞展開失敗，降級為原始 query 搜尋",
			"query", input.Query,
			"error", err,
		)
		degraded = true
		keywords = []string{input.Query}
	} else {
		keywords = synonyms
		// 確保原始 query 在關鍵字列表中
		found := false
		for _, kw := range keywords {
			if strings.EqualFold(kw, input.Query) {
				found = true
				break
			}
		}
		if !found {
			keywords = append([]string{input.Query}, keywords...)
		}
	}

	// 執行搜尋
	results, total, err := s.searchRepo.Search(ctx, repository.SearchParams{
		Keywords:      keywords,
		CategoryID:    input.CategoryID,
		Domains:       input.Domains,
		ContextFilter: input.ContextFilter,
		Limit:         input.Limit,
		Offset:        0,
	})
	if err != nil {
		return nil, err
	}

	// 轉換結果
	output := &SmartSearchOutput{
		Results:      make([]SearchResultOutput, 0, len(results)),
		SynonymsUsed: []string{},
		Total:        total,
		Degraded:     degraded,
	}

	if !degraded {
		output.SynonymsUsed = synonyms
	}

	for _, r := range results {
		preview := ""
		if r.ContentPreview != nil {
			preview = *r.ContentPreview
		}
		tags := r.Tags
		if tags == nil {
			tags = []string{}
		}
		domains := r.Domains
		if domains == nil {
			domains = []string{}
		}

		item := SearchResultOutput{
			EntryID:         r.EntryID,
			Title:           r.Title,
			Summary:         r.Summary,
			ContentPreview:  preview,
			Tags:            tags,
			Domains:         domains,
			Context:         r.Context,
			LifecycleStatus: computeLifecycleStatus(r.SupersededBy, r.Confidence),
			SupersededBy:    r.SupersededBy,
			Relevance:       r.Relevance,
		}

		// 只在非降級模式下計算 matched_keywords
		if !degraded {
			item.MatchedKeywords = findMatchedKeywords(r, keywords)
		}

		output.Results = append(output.Results, item)
	}

	return output, nil
}

// SimpleSearch 簡單搜尋：純資料庫全文搜尋
func (s *SearchService) SimpleSearch(ctx context.Context, input SimpleSearchInput) (*SimpleSearchOutput, error) {
	// 驗證輸入
	if err := validateSearchQuery(input.Query); err != nil {
		return nil, err
	}
	if input.Limit < 1 || input.Limit > 50 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "limit 必須為 1-50 的整數")
	}
	if input.Offset < 0 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "offset 必須為非負整數")
	}

	results, total, err := s.searchRepo.Search(ctx, repository.SearchParams{
		Keywords:      []string{input.Query},
		CategoryID:    input.CategoryID,
		Tags:          input.Tags,
		Domains:       input.Domains,
		ContextFilter: input.ContextFilter,
		Limit:         input.Limit,
		Offset:        input.Offset,
	})
	if err != nil {
		return nil, err
	}

	output := &SimpleSearchOutput{
		Results:  make([]SimpleSearchResultOutput, 0, len(results)),
		Total:    total,
		Degraded: false,
	}

	for _, r := range results {
		preview := ""
		if r.ContentPreview != nil {
			preview = *r.ContentPreview
		}
		tags := r.Tags
		if tags == nil {
			tags = []string{}
		}

		domains := r.Domains
		if domains == nil {
			domains = []string{}
		}
		output.Results = append(output.Results, SimpleSearchResultOutput{
			EntryID:         r.EntryID,
			Title:           r.Title,
			Summary:         r.Summary,
			ContentPreview:  preview,
			Tags:            tags,
			Domains:         domains,
			Context:         r.Context,
			LifecycleStatus: computeLifecycleStatus(r.SupersededBy, r.Confidence),
			SupersededBy:    r.SupersededBy,
			Relevance:       r.Relevance,
		})
	}

	return output, nil
}

// computeLifecycleStatus 根據 superseded_by 和 confidence 計算生命週期狀態
func computeLifecycleStatus(supersededBy *uuid.UUID, confidence float64) string {
	if supersededBy != nil {
		return "superseded"
	}
	if confidence <= 0.2 {
		return "degraded"
	}
	return "active"
}

// validateSearchQuery 驗證搜尋 query
func validateSearchQuery(query string) *model.AppError {
	q := strings.TrimSpace(query)
	if q == "" {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "query 不可為空")
	}
	if len([]rune(q)) > 500 {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "query 不可超過 500 字")
	}
	return nil
}

// findMatchedKeywords 找出結果中匹配到的關鍵字
func findMatchedKeywords(result repository.SearchResult, keywords []string) []string {
	matched := []string{}
	// 簡單比對：title + content_preview + tags 中包含的關鍵字
	searchText := ""
	if result.Title != nil {
		searchText += strings.ToLower(*result.Title) + " "
	}
	if result.ContentPreview != nil {
		searchText += strings.ToLower(*result.ContentPreview) + " "
	}
	for _, tag := range result.Tags {
		searchText += strings.ToLower(tag) + " "
	}

	for _, kw := range keywords {
		if strings.Contains(searchText, strings.ToLower(kw)) {
			matched = append(matched, kw)
		}
	}
	return matched
}
