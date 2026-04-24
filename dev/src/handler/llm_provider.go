package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// LlmProviderHandler LLM Provider HTTP handlers
type LlmProviderHandler struct {
	svc *service.LlmProviderService
}

// NewLlmProviderHandler 建立新的 LlmProviderHandler
func NewLlmProviderHandler(svc *service.LlmProviderService) *LlmProviderHandler {
	return &LlmProviderHandler{svc: svc}
}

// Create 建立新的 LLM Provider
// POST /api/v1/llm-providers
func (h *LlmProviderHandler) Create(c *gin.Context) {
	var req dto.CreateLlmProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	isDefault := false
	if req.IsDefault != nil {
		isDefault = *req.IsDefault
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	input := service.CreateInput{
		Name:        req.Name,
		EndpointURL: req.EndpointURL,
		ApiKey:      req.ApiKey,
		ModelName:   req.ModelName,
		IsDefault:   isDefault,
		Config:      req.Config,
		IsActive:    isActive,
	}

	provider, err := h.svc.Create(c.Request.Context(), input)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, toProviderResponse(provider))
}

// List 列出所有 LLM Providers
// GET /api/v1/llm-providers
func (h *LlmProviderHandler) List(c *gin.Context) {
	providers, err := h.svc.List(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	items := make([]dto.LlmProviderResponse, len(providers))
	for i, p := range providers {
		items[i] = toProviderResponse(&p)
	}

	c.JSON(http.StatusOK, dto.ListLlmProvidersResponse{Data: items})
}

// Get 取得單筆 LLM Provider
// GET /api/v1/llm-providers/:id
func (h *LlmProviderHandler) Get(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	provider, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toProviderResponse(provider))
}

// Update 全量更新 LLM Provider
// PUT /api/v1/llm-providers/:id
func (h *LlmProviderHandler) Update(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	var req dto.UpdateLlmProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	input := service.UpdateInput{
		Name:        req.Name,
		EndpointURL: req.EndpointURL,
		ApiKey:      req.ApiKey,
		ApiKeyOmit:  req.ApiKey == nil, // 請求中未提供 api_key 時，保留原值不更新
		ModelName:   req.ModelName,
		IsDefault:   req.IsDefault,
		Config:      req.Config,
		IsActive:    req.IsActive,
	}

	provider, err := h.svc.Update(c.Request.Context(), id, input)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toProviderResponse(provider))
}

// Delete 刪除 LLM Provider
// DELETE /api/v1/llm-providers/:id
func (h *LlmProviderHandler) Delete(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// HealthCheck 健康檢查
// POST /api/v1/llm-providers/:id/health
func (h *LlmProviderHandler) HealthCheck(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	result, err := h.svc.HealthCheck(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.HealthCheckResponse{
		Status:         result.Status,
		ResponseTimeMs: result.ResponseTimeMs,
		Error:          result.Error,
	})
}

// toProviderResponse 將 model 轉換為 response DTO
func toProviderResponse(p *model.LlmProvider) dto.LlmProviderResponse {
	return dto.LlmProviderResponse{
		ID:          p.ID,
		Name:        p.Name,
		EndpointURL: p.EndpointURL,
		ApiKeySet:   p.ApiKeySet(),
		ModelName:   p.ModelName,
		IsDefault:   p.IsDefault,
		Config:      p.Config,
		IsActive:    p.IsActive,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}


// handleError 統一處理錯誤回應
func handleError(c *gin.Context, err error) {
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
