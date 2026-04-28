package service

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
)

const maxSavedViews = 50

// ViewRepositoryInterface saved_views repository 介面
type ViewRepositoryInterface interface {
	FindAll(ctx context.Context) ([]*model.SavedView, error)
	FindByID(ctx context.Context, id uuid.UUID) (*model.SavedView, error)
	Count(ctx context.Context) (int, error)
	MaxPosition(ctx context.Context) (int, error)
	Create(ctx context.Context, v *model.SavedView) error
	Update(ctx context.Context, v *model.SavedView) error
	Delete(ctx context.Context, id uuid.UUID) error
	Reorder(ctx context.Context, ids []uuid.UUID) (int, error)
}

// ViewService saved views 業務邏輯
type ViewService struct {
	repo ViewRepositoryInterface
}

// NewViewService 建立新的 ViewService
func NewViewService(repo ViewRepositoryInterface) *ViewService {
	return &ViewService{repo: repo}
}

// List 列出所有 saved views
func (s *ViewService) List(ctx context.Context) ([]*model.SavedView, error) {
	return s.repo.FindAll(ctx)
}

// Create 建立新 saved view
func (s *ViewService) Create(ctx context.Context, req dto.CreateViewRequest) (*model.SavedView, error) {
	// 驗證 name
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "name 不可為空")
	}
	if len(name) > 100 {
		return nil, model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "name 最多 100 字")
	}

	// 驗證 filters 大小 (max 4KB)
	if len(req.Filters) > 4096 {
		return nil, model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "filters 超過 4KB 上限")
	}

	// 驗證上限 50
	count, err := s.repo.Count(ctx)
	if err != nil {
		return nil, err
	}
	if count >= maxSavedViews {
		return nil, model.NewAppError(http.StatusBadRequest, model.ErrCodeViewLimitExceeded, "已達 saved view 上限（50 個）")
	}

	// scope 預設 library
	scope := req.Scope
	if scope == "" {
		scope = "library"
	}

	// filters 預設 {}
	filters := req.Filters
	if len(filters) == 0 {
		filters = json.RawMessage("{}")
	}

	// position 預設 maxPosition + 1
	position := 0
	if req.Position != nil {
		position = *req.Position
	} else {
		maxPos, err := s.repo.MaxPosition(ctx)
		if err != nil {
			return nil, err
		}
		position = maxPos + 1
	}

	now := time.Now().UTC()
	v := &model.SavedView{
		ID:        uuid.New(),
		Name:      name,
		Scope:     scope,
		Filters:   filters,
		SortBy:    req.SortBy,
		SortDir:   req.SortDir,
		Icon:      req.Icon,
		Position:  position,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, v); err != nil {
		return nil, err
	}
	return v, nil
}

// Update 部分更新 saved view
func (s *ViewService) Update(ctx context.Context, id uuid.UUID, req dto.UpdateViewRequest) (*model.SavedView, error) {
	v, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if v == nil {
		return nil, model.NewAppError(http.StatusNotFound, model.ErrCodeViewNotFound, "找不到指定的 view")
	}

	// 套用部分更新
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "name 不可為空")
		}
		v.Name = name
	}
	if req.Scope != nil {
		v.Scope = *req.Scope
	}
	if len(req.Filters) > 0 {
		if len(req.Filters) > 4096 {
			return nil, model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "filters 超過 4KB 上限")
		}
		v.Filters = req.Filters
	}
	if req.SortBy != nil {
		v.SortBy = req.SortBy
	}
	if req.SortDir != nil {
		v.SortDir = req.SortDir
	}
	if req.Icon != nil {
		v.Icon = req.Icon
	}
	if req.Position != nil {
		v.Position = *req.Position
	}
	v.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, v); err != nil {
		return nil, err
	}
	return v, nil
}

// Delete 刪除 saved view
func (s *ViewService) Delete(ctx context.Context, id uuid.UUID) error {
	v, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if v == nil {
		return model.NewAppError(http.StatusNotFound, model.ErrCodeViewNotFound, "找不到指定的 view")
	}
	return s.repo.Delete(ctx, id)
}

// Reorder 重新排序 saved views
func (s *ViewService) Reorder(ctx context.Context, ids []uuid.UUID) (int, error) {
	return s.repo.Reorder(ctx, ids)
}
