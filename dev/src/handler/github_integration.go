package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// GitHubIntegrationHandler GitHub 整合相關 HTTP handler
type GitHubIntegrationHandler struct {
	svc *service.GitHubIntegrationService
}

// NewGitHubIntegrationHandler 建立新的 GitHubIntegrationHandler
func NewGitHubIntegrationHandler(svc *service.GitHubIntegrationService) *GitHubIntegrationHandler {
	return &GitHubIntegrationHandler{svc: svc}
}

// Connect 連接 GitHub（儲存並驗證 PAT）
// POST /api/v1/integrations/github/connect
//
// 成功：201 Created，扁平 body 含 id / username / scopes / token_set / created_at / updated_at
// 失敗：
//   - 400 Bad Request：缺少 token 欄位
//   - 422 GITHUB_TOKEN_INVALID：PAT 無效或已過期
//   - 422 GITHUB_TOKEN_INSUFFICIENT_SCOPE：PAT 缺少必要 scopes
//   - 503 GITHUB_UNAVAILABLE：GitHub API 無法連線
func (h *GitHubIntegrationHandler) Connect(c *gin.Context) {
	var req dto.GitHubConnectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "token 欄位為必填",
		})
		return
	}

	result, err := h.svc.Connect(c.Request.Context(), req.Token)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "伺服器內部錯誤"})
		return
	}

	gi := result.Integration
	c.JSON(http.StatusCreated, dto.GitHubConnectResponse{
		ID:           gi.ID.String(),
		Username:     gi.Username,
		Scopes:       gi.Scopes,
		TokenSet:     true,
		LastSyncedAt: gi.LastSyncedAt,
		LastError:    gi.LastError,
		LastErrorAt:  gi.LastErrorAt,
		CreatedAt:    gi.CreatedAt,
		UpdatedAt:    gi.UpdatedAt,
	})
}

// GetStatus 取得 GitHub 整合狀態
// GET /api/v1/integrations/github/status
//
// 未連接：200 { "connected": false }
// 已連接：200 扁平結構含 connected / id / username / scopes / token_set / last_synced_at / last_error / last_error_at / created_at / updated_at
func (h *GitHubIntegrationHandler) GetStatus(c *gin.Context) {
	connected, gi, err := h.svc.GetStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "伺服器內部錯誤"})
		return
	}

	if !connected {
		c.JSON(http.StatusOK, dto.GitHubStatusDisconnectedResponse{
			Connected: false,
		})
		return
	}

	c.JSON(http.StatusOK, dto.GitHubStatusConnectedResponse{
		Connected:    true,
		ID:           gi.ID.String(),
		Username:     gi.Username,
		Scopes:       gi.Scopes,
		TokenSet:     true,
		LastSyncedAt: gi.LastSyncedAt,
		LastError:    gi.LastError,
		LastErrorAt:  gi.LastErrorAt,
		CreatedAt:    gi.CreatedAt,
		UpdatedAt:    gi.UpdatedAt,
	})
}

// Disconnect 中斷 GitHub 整合（刪除儲存的 PAT）
// DELETE /api/v1/integrations/github
//
// 成功：204 No Content
// 失敗：404 GITHUB_NOT_CONNECTED（尚未設定）
func (h *GitHubIntegrationHandler) Disconnect(c *gin.Context) {
	if err := h.svc.Disconnect(c.Request.Context()); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "伺服器內部錯誤"})
		return
	}
	c.Status(http.StatusNoContent)
}
