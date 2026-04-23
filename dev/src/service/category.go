package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
)

// CategoryService 分類業務邏輯
type CategoryService struct {
	repo CategoryRepository
}

// NewCategoryService 建立新的 CategoryService
func NewCategoryService(repo CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

// Create 建立新分類
func (s *CategoryService) Create(ctx context.Context, name string, description *string, sortOrder *int) (*model.Category, error) {
	// 驗證 name
	if err := validateCategoryName(name); err != nil {
		return nil, err
	}

	// 驗證 description
	if err := validateCategoryDescription(description); err != nil {
		return nil, err
	}

	// 驗證 sort_order
	order := 0
	if sortOrder != nil {
		order = *sortOrder
	}
	if err := validateSortOrder(order); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	cat := &model.Category{
		ID:          uuid.New(),
		Name:        name,
		Description: description,
		SortOrder:   order,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(ctx, cat); err != nil {
		return nil, err
	}

	return cat, nil
}

// GetByID 取得單筆分類（含 entry_count）
func (s *CategoryService) GetByID(ctx context.Context, id uuid.UUID) (*model.Category, error) {
	cat, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if cat == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "分類不存在")
	}
	return cat, nil
}

// List 列出所有分類（含 entry_count）
func (s *CategoryService) List(ctx context.Context) ([]model.Category, error) {
	return s.repo.List(ctx)
}

// Update 全量更新分類
func (s *CategoryService) Update(ctx context.Context, id uuid.UUID, name string, description *string, sortOrder int) (*model.Category, error) {
	// 驗證 name
	if err := validateCategoryName(name); err != nil {
		return nil, err
	}

	// 驗證 description
	if err := validateCategoryDescription(description); err != nil {
		return nil, err
	}

	// 驗證 sort_order
	if err := validateSortOrder(sortOrder); err != nil {
		return nil, err
	}

	// 檢查是否存在
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "分類不存在")
	}

	existing.Name = name
	existing.Description = description
	existing.SortOrder = sortOrder

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}

	// 重新查詢以取得更新後的 updated_at 和 entry_count
	updated, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "分類不存在")
	}
	return updated, nil
}

// Delete 刪除分類
func (s *CategoryService) Delete(ctx context.Context, id uuid.UUID) error {
	// 檢查是否存在
	exists, err := s.repo.ExistsByID(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return model.NewAppError(404, model.ErrCodeNotFound, "分類不存在")
	}

	return s.repo.Delete(ctx, id)
}

// validateCategoryName 驗證分類名稱
func validateCategoryName(name string) *model.AppError {
	if name == "" {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "name 不可為空")
	}
	if len([]rune(name)) > 50 {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "name 不可超過 50 字元")
	}
	return nil
}

// validateCategoryDescription 驗證分類描述
func validateCategoryDescription(desc *string) *model.AppError {
	if desc != nil && len([]rune(*desc)) > 200 {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "description 不可超過 200 字元")
	}
	return nil
}

// validateSortOrder 驗證排序順序
func validateSortOrder(order int) *model.AppError {
	if order < 0 {
		return model.NewAppError(400, model.ErrCodeInvalidInput, "sort_order 必須 >= 0")
	}
	return nil
}
