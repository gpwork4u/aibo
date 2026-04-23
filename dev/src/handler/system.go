package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/service"
)

// SystemHandler 系統資訊 HTTP handler
type SystemHandler struct {
	svc *service.SystemService
}

// NewSystemHandler 建立新的 SystemHandler
func NewSystemHandler(svc *service.SystemService) *SystemHandler {
	return &SystemHandler{svc: svc}
}

// GetSearchConfig 取得搜尋配置資訊
// GET /api/v1/system/search-config
func (h *SystemHandler) GetSearchConfig(c *gin.Context) {
	result, err := h.svc.GetSearchConfig(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "取得搜尋配置資訊失敗",
		})
		return
	}

	c.JSON(http.StatusOK, dto.SearchConfigResponse{
		FTSConfig:      result.FTSConfig,
		Extensions:     result.Extensions,
		ChineseSupport: result.ChineseSupport,
	})
}
