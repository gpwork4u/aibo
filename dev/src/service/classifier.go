package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// ClassifierService 自動分類業務邏輯
type ClassifierService struct {
	llmSvc      *LlmService
	entryRepo   *repository.EntryRepository
	categoryRepo *repository.CategoryRepository
}

// NewClassifierService 建立新的 ClassifierService
func NewClassifierService(
	llmSvc *LlmService,
	entryRepo *repository.EntryRepository,
	categoryRepo *repository.CategoryRepository,
) *ClassifierService {
	return &ClassifierService{
		llmSvc:      llmSvc,
		entryRepo:   entryRepo,
		categoryRepo: categoryRepo,
	}
}

// ClassifyEntry 對單筆 entry 進行 LLM 分類
func (s *ClassifierService) ClassifyEntry(ctx context.Context, entryID uuid.UUID) error {
	// 取得 entry
	entry, err := s.entryRepo.FindByID(ctx, entryID)
	if err != nil {
		return fmt.Errorf("查詢 entry 失敗: %w", err)
	}
	if entry == nil {
		return model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}

	// 準備要分類的內容
	content := ""
	if entry.Content != nil {
		content = *entry.Content
	}
	if entry.Title != nil {
		content = *entry.Title + "\n" + content
	}
	if content == "" {
		slog.Warn("entry 內容為空，跳過分類", "entry_id", entryID)
		return nil
	}

	// 取得所有現有分類名稱
	categories, err := s.categoryRepo.List(ctx)
	if err != nil {
		return fmt.Errorf("查詢分類列表失敗: %w", err)
	}
	categoryNames := make([]string, 0, len(categories))
	for _, cat := range categories {
		categoryNames = append(categoryNames, cat.Name)
	}

	// 呼叫 LLM 分類
	result, err := s.llmSvc.Classify(ctx, content, categoryNames)
	if err != nil {
		return fmt.Errorf("LLM 分類失敗: %w", err)
	}

	slog.Info("LLM 分類結果",
		"entry_id", entryID,
		"category", result.Category,
		"tags", result.Tags,
		"title", result.Title,
	)

	// Category 匹配：LOWER(TRIM()) case-insensitive
	categoryID, err := s.matchOrCreateCategory(ctx, result.Category, categories)
	if err != nil {
		return fmt.Errorf("分類匹配/建立失敗: %w", err)
	}

	// 更新 entry
	entry.CategoryID = &categoryID

	// tags 合併（union）
	if len(result.Tags) > 0 {
		entry.Tags = mergeTags(entry.Tags, result.Tags)
	}

	// title 僅在原本為空時覆蓋
	if entry.Title == nil && result.Title != "" {
		entry.Title = &result.Title
	}

	if err := s.entryRepo.Update(ctx, entry); err != nil {
		return fmt.Errorf("更新 entry 失敗: %w", err)
	}

	slog.Info("entry 分類完成",
		"entry_id", entryID,
		"category_id", categoryID,
		"tags", entry.Tags,
	)

	return nil
}

// ClassifyAllInboxAsync 在背景逐筆分類所有 inbox entries（序列執行）
func (s *ClassifierService) ClassifyAllInboxAsync(ctx context.Context, entryIDs []uuid.UUID) {
	for _, id := range entryIDs {
		select {
		case <-ctx.Done():
			slog.Info("批次分類被取消", "remaining", len(entryIDs))
			return
		default:
		}

		if err := s.ClassifyEntry(ctx, id); err != nil {
			slog.Error("批次分類失敗，跳過此 entry",
				"entry_id", id,
				"error", err,
			)
			// 失敗時 entry 保持原狀，繼續下一筆
		}
	}
}

// GetInboxEntryIDs 取得所有未分類的 entry IDs
func (s *ClassifierService) GetInboxEntryIDs(ctx context.Context) ([]uuid.UUID, error) {
	nullStr := "null"
	filter := model.EntryFilter{
		CategoryID: &nullStr,
		Page:       1,
		PerPage:    100,
	}

	result, err := s.entryRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("查詢未分類 entries 失敗: %w", err)
	}

	if result.Pagination.Total == 0 {
		return nil, nil
	}

	entryIDs := make([]uuid.UUID, 0, result.Pagination.Total)
	for _, item := range result.Data {
		entryIDs = append(entryIDs, item.ID)
	}

	for page := 2; page <= result.Pagination.TotalPages; page++ {
		filter.Page = page
		pageResult, err := s.entryRepo.List(ctx, filter)
		if err != nil {
			return nil, fmt.Errorf("查詢未分類 entries 第 %d 頁失敗: %w", page, err)
		}
		for _, item := range pageResult.Data {
			entryIDs = append(entryIDs, item.ID)
		}
	}

	return entryIDs, nil
}

// matchOrCreateCategory 比對或建立分類
func (s *ClassifierService) matchOrCreateCategory(ctx context.Context, categoryName string, existingCategories []model.Category) (uuid.UUID, error) {
	// LOWER(TRIM()) case-insensitive 比對
	normalizedName := strings.ToLower(strings.TrimSpace(categoryName))

	for _, cat := range existingCategories {
		if strings.ToLower(strings.TrimSpace(cat.Name)) == normalizedName {
			return cat.ID, nil
		}
	}

	// 不存在，自動建立新的 Category
	slog.Info("自動建立新分類", "name", categoryName)
	now := time.Now().UTC()
	newCat := &model.Category{
		ID:        uuid.New(),
		Name:      strings.TrimSpace(categoryName),
		SortOrder: 0,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.categoryRepo.Create(ctx, newCat); err != nil {
		// 如果同時有其他 goroutine 建立了相同名稱的 category（race condition），重新查詢
		if strings.Contains(err.Error(), "DUPLICATE_CATEGORY") || strings.Contains(err.Error(), "idx_categories_name_lower") {
			// 重新取得分類列表
			cats, listErr := s.categoryRepo.List(ctx)
			if listErr != nil {
				return uuid.Nil, fmt.Errorf("重新查詢分類列表失敗: %w", listErr)
			}
			for _, cat := range cats {
				if strings.ToLower(strings.TrimSpace(cat.Name)) == normalizedName {
					return cat.ID, nil
				}
			}
		}
		return uuid.Nil, fmt.Errorf("建立分類失敗: %w", err)
	}

	return newCat.ID, nil
}

// mergeTags 合併 tags（union，去重）
func mergeTags(existing, newTags []string) []string {
	tagSet := make(map[string]bool)
	for _, t := range existing {
		tagSet[t] = true
	}
	for _, t := range newTags {
		tagSet[t] = true
	}

	result := make([]string, 0, len(tagSet))
	// 先保留原有順序
	for _, t := range existing {
		if tagSet[t] {
			result = append(result, t)
			delete(tagSet, t)
		}
	}
	// 再加入新的
	for _, t := range newTags {
		if tagSet[t] {
			result = append(result, t)
			delete(tagSet, t)
		}
	}
	return result
}
