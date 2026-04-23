package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// EntryService 知識條目業務邏輯
type EntryService struct {
	repo *repository.EntryRepository
}

// NewEntryService 建立新的 EntryService
func NewEntryService(repo *repository.EntryRepository) *EntryService {
	return &EntryService{repo: repo}
}

// Create 建立新知識條目
func (s *EntryService) Create(ctx context.Context, title, content *string, categoryID *uuid.UUID,
	source, sourceType, sourceRef *string, tags []string) (*model.Entry, error) {

	// 驗證 title 和 content 至少一個非空
	if (title == nil || *title == "") && (content == nil || *content == "") {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "title 和 content 至少需要填寫一個")
	}

	// 驗證 title 長度
	if title != nil && len([]rune(*title)) > 100 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "title 不可超過 100 字元")
	}

	// 驗證 source 長度
	if source != nil && len([]rune(*source)) > 500 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "source 不可超過 500 字元")
	}

	// 驗證 source_type 長度
	if sourceType != nil && len([]rune(*sourceType)) > 20 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "source_type 不可超過 20 字元")
	}

	// 驗證 source_ref 長度
	if sourceRef != nil && len([]rune(*sourceRef)) > 500 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "source_ref 不可超過 500 字元")
	}

	// 空字串視為 null
	if title != nil && *title == "" {
		title = nil
	}
	if content != nil && *content == "" {
		content = nil
	}

	// 驗證 category_id 存在
	if categoryID != nil {
		exists, err := s.repo.CategoryExists(ctx, *categoryID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, model.NewAppError(400, model.ErrCodeCategoryNotFound, "指定的分類不存在")
		}
	}

	// 初始化 tags
	if tags == nil {
		tags = []string{}
	}

	now := time.Now().UTC()
	entry := &model.Entry{
		ID:            uuid.New(),
		Title:         title,
		Content:       content,
		CategoryID:    categoryID,
		Source:        source,
		SourceType:    sourceType,
		SourceRef:     sourceRef,
		Tags:          tags,
		IsArchived:    false,
		Confidence:    0.5,
		Confirmations: 0,
		FlagsCount:    0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repo.Create(ctx, entry); err != nil {
		return nil, err
	}

	return entry, nil
}

// GetByID 取得單筆知識條目（完整 content）
func (s *EntryService) GetByID(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	entry, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if entry == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}
	return entry, nil
}

// List 列表查詢知識條目
func (s *EntryService) List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error) {
	// 驗證分頁參數
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PerPage < 1 {
		filter.PerPage = 20
	}
	if filter.PerPage > 100 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "per_page 不可超過 100")
	}

	// 驗證排序參數
	validSorts := map[string]bool{"created_at": true, "updated_at": true, "title": true}
	if filter.Sort != "" && !validSorts[filter.Sort] {
		filter.Sort = "created_at"
	}
	if filter.Sort == "" {
		filter.Sort = "created_at"
	}

	validOrders := map[string]bool{"asc": true, "desc": true}
	if filter.Order != "" && !validOrders[filter.Order] {
		filter.Order = "desc"
	}
	if filter.Order == "" {
		filter.Order = "desc"
	}

	return s.repo.List(ctx, filter)
}

// Update 部分更新知識條目（PATCH）
func (s *EntryService) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) (*model.Entry, error) {
	// 取得現有條目
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}

	// 逐一套用更新欄位
	if v, ok := updates["title"]; ok {
		if v == nil {
			existing.Title = nil
		} else {
			s := v.(string)
			if len([]rune(s)) > 100 {
				return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "title 不可超過 100 字元")
			}
			existing.Title = &s
		}
	}

	if v, ok := updates["content"]; ok {
		if v == nil {
			existing.Content = nil
		} else {
			s := v.(string)
			existing.Content = &s
		}
	}

	if v, ok := updates["category_id"]; ok {
		if v == nil {
			existing.CategoryID = nil
		} else {
			catID := v.(uuid.UUID)
			exists, err := s.repo.CategoryExists(ctx, catID)
			if err != nil {
				return nil, err
			}
			if !exists {
				return nil, model.NewAppError(400, model.ErrCodeCategoryNotFound, "指定的分類不存在")
			}
			existing.CategoryID = &catID
		}
	}

	if v, ok := updates["source"]; ok {
		if v == nil {
			existing.Source = nil
		} else {
			s := v.(string)
			existing.Source = &s
		}
	}

	if v, ok := updates["source_type"]; ok {
		if v == nil {
			existing.SourceType = nil
		} else {
			s := v.(string)
			existing.SourceType = &s
		}
	}

	if v, ok := updates["source_ref"]; ok {
		if v == nil {
			existing.SourceRef = nil
		} else {
			s := v.(string)
			existing.SourceRef = &s
		}
	}

	if v, ok := updates["summary"]; ok {
		if v == nil {
			existing.Summary = nil
		} else {
			s := v.(string)
			existing.Summary = &s
		}
	}

	if v, ok := updates["detail"]; ok {
		if v == nil {
			existing.Detail = nil
		} else {
			s := v.(string)
			existing.Detail = &s
		}
	}

	if v, ok := updates["action"]; ok {
		if v == nil {
			existing.Action = nil
		} else {
			s := v.(string)
			existing.Action = &s
		}
	}

	if v, ok := updates["tags"]; ok {
		if v == nil {
			existing.Tags = []string{}
		} else {
			existing.Tags = v.([]string)
		}
	}

	if v, ok := updates["is_archived"]; ok {
		existing.IsArchived = v.(bool)
	}

	// 驗證更新後 title 和 content 不能同時為 null
	if existing.Title == nil && existing.Content == nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "title 和 content 不可同時為空")
	}

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}

	// 重新查詢以取得 DB 更新的 updated_at
	return s.repo.FindByID(ctx, id)
}

// Delete 硬刪除知識條目
func (s *EntryService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// ConfirmEntry 確認知識條目有用
func (s *EntryService) ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return s.repo.ConfirmEntry(ctx, id)
}

// FlagEntry 標記知識條目問題
func (s *EntryService) FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error) {
	// 驗證 reason
	if !model.ValidFlagReasons[reason] {
		return nil, nil, model.NewAppError(400, model.ErrCodeInvalidInput, "無效的 reason，允許值：outdated, inaccurate, incomplete, duplicate")
	}
	return s.repo.FlagEntry(ctx, id, reason, note)
}

// GetFlags 取得知識條目的所有 flag 記錄
func (s *EntryService) GetFlags(ctx context.Context, entryID uuid.UUID) ([]model.EntryFlag, error) {
	// 先確認 entry 存在
	entry, err := s.repo.FindByID(ctx, entryID)
	if err != nil {
		return nil, err
	}
	if entry == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}
	return s.repo.GetFlags(ctx, entryID)
}
