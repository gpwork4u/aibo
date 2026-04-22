package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// CategoryHandler 分類 HTTP handlers
type CategoryHandler struct {
	svc *service.CategoryService
}

// NewCategoryHandler 建立新的 CategoryHandler
func NewCategoryHandler(svc *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{svc: svc}
}

// Create 建立新分類
// POST /api/v1/categories
func (h *CategoryHandler) Create(c *gin.Context) {
	var req dto.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	cat, err := h.svc.Create(c.Request.Context(), req.Name, req.Description, req.SortOrder)
	if err != nil {
		handleCategoryError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.CategoryResponse{
		ID:          cat.ID,
		Name:        cat.Name,
		Description: cat.Description,
		SortOrder:   cat.SortOrder,
		CreatedAt:   cat.CreatedAt,
		UpdatedAt:   cat.UpdatedAt,
	})
}

// List 列出所有分類
// GET /api/v1/categories
func (h *CategoryHandler) List(c *gin.Context) {
	categories, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "伺服器內部錯誤",
		})
		return
	}

	items := make([]dto.CategoryItemResponse, 0, len(categories))
	for _, cat := range categories {
		items = append(items, dto.CategoryItemResponse{
			ID:          cat.ID,
			Name:        cat.Name,
			Description: cat.Description,
			SortOrder:   cat.SortOrder,
			EntryCount:  cat.EntryCount,
			CreatedAt:   cat.CreatedAt,
			UpdatedAt:   cat.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, dto.ListCategoriesResponse{Data: items})
}

// GetByID 取得單筆分類
// GET /api/v1/categories/:id
func (h *CategoryHandler) GetByID(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	cat, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		handleCategoryError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.CategoryItemResponse{
		ID:          cat.ID,
		Name:        cat.Name,
		Description: cat.Description,
		SortOrder:   cat.SortOrder,
		EntryCount:  cat.EntryCount,
		CreatedAt:   cat.CreatedAt,
		UpdatedAt:   cat.UpdatedAt,
	})
}

// Update 全量更新分類
// PUT /api/v1/categories/:id
func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	var req dto.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	cat, err := h.svc.Update(c.Request.Context(), id, req.Name, req.Description, req.SortOrder)
	if err != nil {
		handleCategoryError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.CategoryItemResponse{
		ID:          cat.ID,
		Name:        cat.Name,
		Description: cat.Description,
		SortOrder:   cat.SortOrder,
		EntryCount:  cat.EntryCount,
		CreatedAt:   cat.CreatedAt,
		UpdatedAt:   cat.UpdatedAt,
	})
}

// Delete 刪除分類
// DELETE /api/v1/categories/:id
func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		handleCategoryError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// parseUUID 從 URL 參數解析 UUID
func parseUUID(c *gin.Context) (uuid.UUID, error) {
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

// handleCategoryError 處理分類相關錯誤
func handleCategoryError(c *gin.Context, err error) {
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
