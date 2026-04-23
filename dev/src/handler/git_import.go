package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// GitImportHandler Git 匯入 HTTP handler
type GitImportHandler struct {
	svc *service.GitImportService
}

// NewGitImportHandler 建立新的 GitImportHandler
func NewGitImportHandler(svc *service.GitImportService) *GitImportHandler {
	return &GitImportHandler{svc: svc}
}

// Import 同步匯入 Git commits
// POST /api/v1/import/git
func (h *GitImportHandler) Import(c *gin.Context) {
	var req dto.GitImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	result, err := h.svc.ImportCommits(c.Request.Context(), req)
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

	c.JSON(http.StatusOK, result)
}
