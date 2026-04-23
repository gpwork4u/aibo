package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// LifecycleService 知識生命週期業務邏輯
type LifecycleService struct {
	repo *repository.EntryRepository
}

// NewLifecycleService 建立新的 LifecycleService
func NewLifecycleService(repo *repository.EntryRepository) *LifecycleService {
	return &LifecycleService{repo: repo}
}

// Supersede 設定取代關係
func (s *LifecycleService) Supersede(ctx context.Context, oldID, newID uuid.UUID) (*dto.SupersedeResponse, error) {
	// 不能 supersede 自己
	if oldID == newID {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "不能將知識條目指向自己")
	}

	// 驗證 old entry 存在
	oldEntry, err := s.repo.FindByID(ctx, oldID)
	if err != nil {
		return nil, err
	}
	if oldEntry == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}

	// 驗證 new entry 存在
	newEntry, err := s.repo.FindByID(ctx, newID)
	if err != nil {
		return nil, err
	}
	if newEntry == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "new_entry_id 指向的知識條目不存在")
	}

	// 檢查循環引用
	isCircular, err := s.repo.CheckCircularSupersede(ctx, oldID, newID)
	if err != nil {
		return nil, err
	}
	if isCircular {
		return nil, model.NewAppError(409, model.ErrCodeCircularSupersede, "設定此取代關係會形成循環引用")
	}

	// 執行 supersede
	updatedOld, err := s.repo.SupersedeEntry(ctx, oldID, newID)
	if err != nil {
		return nil, err
	}

	return &dto.SupersedeResponse{
		OldEntry: dto.SupersedeEntryInfo{
			ID:           updatedOld.ID,
			SupersededBy: updatedOld.SupersededBy,
			Confidence:   updatedOld.Confidence,
		},
		NewEntry: dto.SupersedeEntryInfo{
			ID:           newEntry.ID,
			SupersededBy: newEntry.SupersededBy,
			Confidence:   newEntry.Confidence,
		},
	}, nil
}

// ClearSupersede 取消取代關係
func (s *LifecycleService) ClearSupersede(ctx context.Context, id uuid.UUID) (*dto.ClearSupersedeResponse, error) {
	// 驗證 entry 存在
	entry, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if entry == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}

	// 清除 supersede
	updated, err := s.repo.ClearSupersede(ctx, id)
	if err != nil {
		return nil, err
	}

	return &dto.ClearSupersedeResponse{
		ID:           updated.ID,
		SupersededBy: updated.SupersededBy,
	}, nil
}

// GetHistory 取得知識版本鏈
func (s *LifecycleService) GetHistory(ctx context.Context, id uuid.UUID) (*dto.HistoryResponse, error) {
	// 驗證 entry 存在
	entry, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if entry == nil {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "知識條目不存在")
	}

	// 取得版本鏈
	chain, err := s.repo.GetSupersedeChain(ctx, id)
	if err != nil {
		return nil, err
	}

	// 轉換為 DTO
	chainItems := make([]dto.HistoryChainItem, 0, len(chain))
	for _, item := range chain {
		status := lifecycleStatusFromHistory(item)
		chainItems = append(chainItems, dto.HistoryChainItem{
			ID:        item.ID,
			Title:     item.Title,
			Status:    status,
			CreatedAt: item.CreatedAt,
		})
	}

	// 最新版本是鏈的最後一個
	var latest dto.HistoryLatest
	if len(chain) > 0 {
		last := chain[len(chain)-1]
		latest = dto.HistoryLatest{
			ID:    last.ID,
			Title: last.Title,
		}
	} else {
		latest = dto.HistoryLatest{
			ID:    entry.ID,
			Title: entry.Title,
		}
	}

	return &dto.HistoryResponse{
		EntryID: id,
		Status:  entry.LifecycleStatus(),
		Chain:   chainItems,
		Latest:  latest,
	}, nil
}

// lifecycleStatusFromHistory 從 HistoryItem 計算生命週期狀態
func lifecycleStatusFromHistory(item repository.HistoryItem) string {
	if item.SupersededBy != nil {
		return "superseded"
	}
	if item.Confidence <= 0.2 {
		return "degraded"
	}
	return "active"
}
