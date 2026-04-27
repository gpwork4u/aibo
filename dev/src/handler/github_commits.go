package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// GitHubCommitsHandler GitHub commits 相關 HTTP handler
type GitHubCommitsHandler struct {
	svc *service.GitHubCommitsService
}

// NewGitHubCommitsHandler 建立新的 GitHubCommitsHandler
func NewGitHubCommitsHandler(svc *service.GitHubCommitsService) *GitHubCommitsHandler {
	return &GitHubCommitsHandler{svc: svc}
}

// ListCommits 取得指定日期的 GitHub commits
// GET /api/v1/integrations/github/commits?date=YYYY-MM-DD
//
// 支援 X-Timezone header（預設 UTC）
// 回應：{ date, username, commits: [...], total: N, truncated: bool }
//
// 錯誤：
//   - 400 INVALID_INPUT：date 參數缺少或格式不正確
//   - 404 GITHUB_NOT_CONNECTED：尚未設定 GitHub 整合
//   - 422 GITHUB_TOKEN_INVALID：PAT 無效或已過期
//   - 429 GITHUB_RATE_LIMITED：rate limit 超限（帶 retry_after_seconds）
//   - 503 GITHUB_UNAVAILABLE：GitHub API 無法連線或 timeout
func (h *GitHubCommitsHandler) ListCommits(c *gin.Context) {
	// 解析 timezone header（預設 UTC）
	tz := c.GetHeader("X-Timezone")
	if tz == "" {
		tz = "UTC"
	}

	loc, err := time.LoadLocation(tz)
	if err != nil {
		slog.Warn("無效的 X-Timezone header", "timezone", tz, "error", err)
		loc = time.UTC
		tz = "UTC"
	}

	// 解析 date 參數（必填，格式：YYYY-MM-DD）
	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "date 參數為必填（格式：YYYY-MM-DD）",
		})
		return
	}

	date, err := time.ParseInLocation("2006-01-02", dateStr, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "date 日期格式不正確，請使用 YYYY-MM-DD",
		})
		return
	}

	// 將 date 解成當天 00:00:00（使用者時區）→ UTC
	sinceUTC := date.UTC()
	// 隔天 00:00:00 UTC（exclusive）
	untilUTC := date.AddDate(0, 0, 1).UTC()

	// 呼叫 service
	commits, meta, err := h.svc.FetchCommits(c.Request.Context(), sinceUTC, untilUTC)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	// 轉換為 DTO
	dtoCommits := make([]dto.GitHubCommit, 0, len(commits))
	for _, cm := range commits {
		dtoCommits = append(dtoCommits, dto.GitHubCommit{
			SHA:         cm.SHA,
			Repo:        cm.Repo,
			Message:     cm.Message,
			URL:         cm.URL,
			CommittedAt: cm.CommittedAt,
			Additions:   cm.Additions,
			Deletions:   cm.Deletions,
		})
	}

	// 組合回應
	resp := dto.GitHubCommitsResponse{
		Date:      dateStr,
		Username:  meta.Username,
		Commits:   dtoCommits,
		Total:     len(dtoCommits),
		Truncated: meta.Truncated,
	}

	// 若截斷，加入 warning 訊息
	if meta.Truncated {
		warning := "已達每日 200 筆上限，部分 commits 未顯示"
		resp.Warning = &warning
	}

	c.JSON(http.StatusOK, resp)
}

// handleServiceError 統一處理 service 層的錯誤
func (h *GitHubCommitsHandler) handleServiceError(c *gin.Context, err error) {
	// rate limit 錯誤（需要回傳 retry_after_seconds）
	var rateLimitErr *model.RateLimitError
	if errors.As(err, &rateLimitErr) {
		c.JSON(http.StatusTooManyRequests, dto.GitHubRateLimitErrorResponse{
			Code:              rateLimitErr.Code,
			Message:           rateLimitErr.Message,
			RetryAfterSeconds: rateLimitErr.RetryAfterSeconds,
		})
		return
	}

	// 一般 AppError
	var appErr *model.AppError
	if errors.As(err, &appErr) {
		c.JSON(appErr.Status, dto.ErrorResponse{
			Code:    appErr.Code,
			Message: appErr.Message,
		})
		return
	}

	// 未知錯誤
	slog.Error("GitHub commits 取得失敗（未知錯誤）", "error", err)
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}
