package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// ConfidenceHandler 信心度相關 HTTP handlers
type ConfidenceHandler struct {
	svc *service.EntryService
}

// NewConfidenceHandler 建立新的 ConfidenceHandler
func NewConfidenceHandler(svc *service.EntryService) *ConfidenceHandler {
	return &ConfidenceHandler{svc: svc}
}

// Confirm 確認知識條目有用
// POST /api/v1/entries/:id/confirm
func (h *ConfidenceHandler) Confirm(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	entry, err := h.svc.ConfirmEntry(c.Request.Context(), id)
	if err != nil {
		handleEntryError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ConfirmResponse{
		EntryID:       entry.ID,
		Confidence:    entry.Confidence,
		Confirmations: entry.Confirmations,
		Message:       "已確認",
	})
}

// Flag 標記知識條目問題
// POST /api/v1/entries/:id/flag
func (h *ConfidenceHandler) Flag(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	var req dto.FlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "reason 為必填",
		})
		return
	}

	entry, _, err := h.svc.FlagEntry(c.Request.Context(), id, req.Reason, req.Note)
	if err != nil {
		handleEntryError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.FlagResponse{
		EntryID:    entry.ID,
		Confidence: entry.Confidence,
		FlagsCount: entry.FlagsCount,
		Message:    "已標記",
	})
}

// ListFlags 查看 entry 的所有 flag 記錄
// GET /api/v1/entries/:id/flags
func (h *ConfidenceHandler) ListFlags(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	flags, err := h.svc.GetFlags(c.Request.Context(), id)
	if err != nil {
		handleEntryError(c, err)
		return
	}

	items := make([]dto.EntryFlagResponse, 0, len(flags))
	for _, f := range flags {
		items = append(items, dto.EntryFlagResponse{
			ID:        f.ID,
			EntryID:   f.EntryID,
			Reason:    f.Reason,
			Note:      f.Note,
			CreatedAt: f.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, dto.ListFlagsResponse{
		Data:  items,
		Total: len(items),
	})
}
