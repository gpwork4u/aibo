package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/service"
)

// StatsHandler 統計 HTTP handler
type StatsHandler struct {
	svc *service.StatsService
}

// NewStatsHandler 建立新的 StatsHandler
func NewStatsHandler(svc *service.StatsService) *StatsHandler {
	return &StatsHandler{svc: svc}
}

// GetStats 取得知識庫統計
// GET /api/v1/stats
func (h *StatsHandler) GetStats(c *gin.Context) {
	result, err := h.svc.GetStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "取得統計資訊失敗",
		})
		return
	}

	byCategory := make([]dto.CategoryCountItem, 0, len(result.EntriesByCategory))
	for _, cc := range result.EntriesByCategory {
		byCategory = append(byCategory, dto.CategoryCountItem{
			Category: cc.Category,
			Count:    cc.Count,
		})
	}

	c.JSON(http.StatusOK, dto.StatsResponse{
		TotalEntries:      result.TotalEntries,
		TotalCategories:   result.TotalCategories,
		EntriesByCategory: byCategory,
		AvgConfidence:     result.AvgConfidence,
	})
}
