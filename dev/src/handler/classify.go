package handler

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

// ClassifyHandler 分類相關 HTTP handlers
type ClassifyHandler struct {
	classifierSvc *service.ClassifierService
	entryRepo     *repository.EntryRepository
}

// NewClassifyHandler 建立新的 ClassifyHandler
func NewClassifyHandler(classifierSvc *service.ClassifierService, entryRepo *repository.EntryRepository) *ClassifyHandler {
	return &ClassifyHandler{
		classifierSvc: classifierSvc,
		entryRepo:     entryRepo,
	}
}

// Classify 手動觸發單筆 entry 分類
// POST /api/v1/entries/:id/classify
func (h *ClassifyHandler) Classify(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "無效的 ID 格式",
		})
		return
	}

	// 確認 entry 存在（同步檢查）
	entry, err := h.entryRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "查詢條目失敗",
		})
		return
	}
	if entry == nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Code:    model.ErrCodeNotFound,
			Message: "知識條目不存在",
		})
		return
	}

	// 背景 goroutine 執行分類
	go func() {
		bgCtx := context.Background()
		if err := h.classifierSvc.ClassifyEntry(bgCtx, id); err != nil {
			slog.Error("手動分類失敗", "entry_id", id, "error", err)
		}
	}()

	c.JSON(http.StatusAccepted, dto.ClassifyResponse{
		Message: "Classification started",
		EntryID: id,
	})
}

// ClassifyAll 批次分類所有 inbox entries
// POST /api/v1/entries/classify-all
func (h *ClassifyHandler) ClassifyAll(c *gin.Context) {
	// 取得所有未分類的 entry IDs（同步查詢）
	entryIDs, err := h.classifierSvc.GetInboxEntryIDs(c.Request.Context())
	if err != nil {
		slog.Error("查詢未分類 entries 失敗", "error", err)
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "查詢未分類條目失敗",
		})
		return
	}

	count := len(entryIDs)

	// 背景批次處理（序列執行）
	if count > 0 {
		go func() {
			bgCtx := context.Background()
			h.classifierSvc.ClassifyAllInboxAsync(bgCtx, entryIDs)
		}()
	}

	c.JSON(http.StatusAccepted, dto.ClassifyAllResponse{
		Message:    "Batch classification started",
		EntryCount: count,
	})
}
