package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// ViewHandler saved views HTTP handlers
type ViewHandler struct {
	svc *service.ViewService
}

// NewViewHandler 建立新的 ViewHandler
func NewViewHandler(svc *service.ViewService) *ViewHandler {
	return &ViewHandler{svc: svc}
}

// List 列出所有 saved views
// GET /api/v1/views
func (h *ViewHandler) List(c *gin.Context) {
	views, err := h.svc.List(c.Request.Context())
	if err != nil {
		handleViewError(c, err)
		return
	}

	resp := make([]dto.ViewResponse, 0, len(views))
	for _, v := range views {
		resp = append(resp, toViewResponse(v))
	}
	c.JSON(http.StatusOK, resp)
}

// Create 建立新 saved view
// POST /api/v1/views
func (h *ViewHandler) Create(c *gin.Context) {
	var req dto.CreateViewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	v, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		handleViewError(c, err)
		return
	}

	c.JSON(http.StatusCreated, toViewResponse(v))
}

// Update 部分更新 saved view
// PATCH /api/v1/views/:id
func (h *ViewHandler) Update(c *gin.Context) {
	id, err := parseViewUUID(c)
	if err != nil {
		return
	}

	var req dto.UpdateViewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	v, err := h.svc.Update(c.Request.Context(), id, req)
	if err != nil {
		handleViewError(c, err)
		return
	}

	c.JSON(http.StatusOK, toViewResponse(v))
}

// Delete 刪除 saved view
// DELETE /api/v1/views/:id
func (h *ViewHandler) Delete(c *gin.Context) {
	id, err := parseViewUUID(c)
	if err != nil {
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		handleViewError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// Reorder 批次更新 position
// PATCH /api/v1/views/reorder
func (h *ViewHandler) Reorder(c *gin.Context) {
	var req dto.ReorderViewsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	updated, err := h.svc.Reorder(c.Request.Context(), req.IDs)
	if err != nil {
		handleViewError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ReorderViewsResponse{Updated: updated})
}

// toViewResponse 將 model.SavedView 轉換為 dto.ViewResponse
func toViewResponse(v *model.SavedView) dto.ViewResponse {
	filters := v.Filters
	if len(filters) == 0 {
		filters = json.RawMessage("{}")
	}
	return dto.ViewResponse{
		ID:        v.ID,
		Name:      v.Name,
		Scope:     v.Scope,
		Filters:   filters,
		SortBy:    v.SortBy,
		SortDir:   v.SortDir,
		Icon:      v.Icon,
		Position:  v.Position,
		CreatedAt: v.CreatedAt,
		UpdatedAt: v.UpdatedAt,
	}
}

// parseViewUUID 從 URL 參數解析 UUID
func parseViewUUID(c *gin.Context) (uuid.UUID, error) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "無效的 ID 格式",
		})
		return uuid.Nil, err
	}
	return id, nil
}

// handleViewError 處理 view 相關錯誤
func handleViewError(c *gin.Context, err error) {
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
