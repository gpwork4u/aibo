package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// ApiKeyHandler API Key HTTP handlers
type ApiKeyHandler struct {
	svc *service.ApiKeyService
}

// NewApiKeyHandler 建立新的 ApiKeyHandler
func NewApiKeyHandler(svc *service.ApiKeyService) *ApiKeyHandler {
	return &ApiKeyHandler{svc: svc}
}

// Create 建立新的 API Key
// POST /api/v1/auth/api-keys
func (h *ApiKeyHandler) Create(c *gin.Context) {
	var req dto.CreateApiKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	// 解析 expires_at
	expiresAt, err := req.ParseExpiresAt()
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "expires_at 格式錯誤，請使用 ISO 8601 格式",
		})
		return
	}

	apiKey, rawKey, err := h.svc.Create(c.Request.Context(), req.Name, expiresAt)
	if err != nil {
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
		return
	}

	c.JSON(http.StatusCreated, dto.CreateApiKeyResponse{
		ID:        apiKey.ID,
		Name:      apiKey.Name,
		Key:       rawKey,
		KeyPrefix: apiKey.KeyPrefix,
		ExpiresAt: apiKey.ExpiresAt,
		CreatedAt: apiKey.CreatedAt,
	})
}

// List 列出所有 API Keys
// GET /api/v1/auth/api-keys
func (h *ApiKeyHandler) List(c *gin.Context) {
	keys, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "伺服器內部錯誤",
		})
		return
	}

	items := make([]dto.ApiKeyItem, len(keys))
	for i, k := range keys {
		items[i] = dto.ApiKeyItem{
			ID:         k.ID,
			Name:       k.Name,
			KeyPrefix:  k.KeyPrefix,
			IsActive:   k.IsActive,
			ExpiresAt:  k.ExpiresAt,
			LastUsedAt: k.LastUsedAt,
			CreatedAt:  k.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, dto.ListApiKeysResponse{Data: items})
}

// Delete 刪除 API Key
// DELETE /api/v1/auth/api-keys/:id
func (h *ApiKeyHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "無效的 ID 格式",
		})
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
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
		return
	}

	c.Status(http.StatusNoContent)
}
