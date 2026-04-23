package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// LifecycleHandler 知識生命週期 HTTP handlers
type LifecycleHandler struct {
	svc *service.LifecycleService
}

// NewLifecycleHandler 建立新的 LifecycleHandler
func NewLifecycleHandler(svc *service.LifecycleService) *LifecycleHandler {
	return &LifecycleHandler{svc: svc}
}

// Supersede 設定取代關係
// POST /api/v1/entries/:id/supersede
func (h *LifecycleHandler) Supersede(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	var req dto.SupersedeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤，new_entry_id 為必填的 UUID",
		})
		return
	}

	result, err := h.svc.Supersede(c.Request.Context(), id, req.NewEntryID)
	if err != nil {
		handleLifecycleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// ClearSupersede 取消取代關係
// DELETE /api/v1/entries/:id/supersede
func (h *LifecycleHandler) ClearSupersede(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	result, err := h.svc.ClearSupersede(c.Request.Context(), id)
	if err != nil {
		handleLifecycleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetHistory 查詢知識版本鏈
// GET /api/v1/entries/:id/history
func (h *LifecycleHandler) GetHistory(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	result, err := h.svc.GetHistory(c.Request.Context(), id)
	if err != nil {
		handleLifecycleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// handleLifecycleError 處理生命週期相關錯誤
func handleLifecycleError(c *gin.Context, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		c.JSON(appErr.Status, dto.ErrorResponse{
			Code:    appErr.Code,
			Message: appErr.Message,
		})
		return
	}
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}
