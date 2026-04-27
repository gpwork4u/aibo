package service

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	gogithub "github.com/google/go-github/v66/github"
	"github.com/gpwork4u/aibo/model"
)

// mapGitHubError 將 go-github SDK 的錯誤轉換為 AppError
//
// 對應規則：
//   - HTTP 401 → GITHUB_TOKEN_INVALID（422）
//   - HTTP 403 且有 RateLimitError → GITHUB_RATE_LIMITED（429）+ retry_after
//   - HTTP 403 其他 → GITHUB_TOKEN_INVALID（422，可能 scope 不足）
//   - HTTP 5xx / 503 → GITHUB_UNAVAILABLE（503）
//   - context timeout/cancel → GITHUB_UNAVAILABLE（503）
//   - 其他 → GITHUB_UNAVAILABLE（503）
func mapGitHubError(err error, resp *gogithub.Response) error {
	if err == nil {
		return nil
	}

	// context 超時或取消
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		slog.Warn("GitHub API 呼叫超時或被取消", "error", err)
		return &model.AppError{
			Status:  http.StatusServiceUnavailable,
			Code:    model.ErrCodeGitHubUnavailable,
			Message: "GitHub API 呼叫超時，請稍後再試",
		}
	}

	// RateLimitError（go-github 有時會直接包成此型別）
	var rateLimitErr *gogithub.RateLimitError
	if errors.As(err, &rateLimitErr) {
		retryAfter := calcRetryAfter(rateLimitErr.Rate.Reset.Time)
		slog.Warn("GitHub API RateLimitError", "retry_after_seconds", retryAfter)
		return &model.RateLimitError{
			AppError: model.AppError{
				Status:  http.StatusTooManyRequests,
				Code:    model.ErrCodeGitHubRateLimited,
				Message: "GitHub API rate limit 超限，請稍後再試",
			},
			RetryAfterSeconds: retryAfter,
		}
	}

	// go-github 的 ErrorResponse（HTTP 4xx/5xx）
	var ghErr *gogithub.ErrorResponse
	if errors.As(err, &ghErr) {
		statusCode := ghErr.Response.StatusCode

		switch {
		case statusCode == http.StatusUnauthorized:
			// 401：PAT 無效或已過期
			slog.Warn("GitHub PAT 無效（401）", "message", ghErr.Message)
			return &model.AppError{
				Status:  http.StatusUnprocessableEntity,
				Code:    model.ErrCodeGitHubTokenInvalid,
				Message: "GitHub Personal Access Token 無效或已過期",
			}

		case statusCode == http.StatusForbidden:
			// 403：先檢查是否為 rate limit（透過傳入的 resp）
			if resp != nil && resp.Rate.Remaining == 0 {
				retryAfter := calcRetryAfter(resp.Rate.Reset.Time)
				slog.Warn("GitHub API rate limit 超限（403）", "retry_after_seconds", retryAfter)
				return &model.RateLimitError{
					AppError: model.AppError{
						Status:  http.StatusTooManyRequests,
						Code:    model.ErrCodeGitHubRateLimited,
						Message: "GitHub API rate limit 超限，請稍後再試",
					},
					RetryAfterSeconds: retryAfter,
				}
			}
			// 403 但非 rate limit → token 權限不足
			slog.Warn("GitHub API 403（非 rate limit）", "message", ghErr.Message)
			return &model.AppError{
				Status:  http.StatusUnprocessableEntity,
				Code:    model.ErrCodeGitHubTokenInvalid,
				Message: "GitHub Personal Access Token 缺少必要的存取權限",
			}

		case statusCode >= http.StatusInternalServerError:
			// 5xx：GitHub 服務不可用
			slog.Warn("GitHub API 回傳 5xx", "status", statusCode)
			return &model.AppError{
				Status:  http.StatusServiceUnavailable,
				Code:    model.ErrCodeGitHubUnavailable,
				Message: "GitHub 服務暫時不可用，請稍後再試",
			}
		}
	}

	// 其餘網路錯誤（連線失敗、DNS 解析等）
	slog.Warn("GitHub API 呼叫失敗", "error", err)
	return &model.AppError{
		Status:  http.StatusServiceUnavailable,
		Code:    model.ErrCodeGitHubUnavailable,
		Message: "無法連線到 GitHub API，請稍後再試",
	}
}

// calcRetryAfter 計算距離 rate limit reset 的秒數
func calcRetryAfter(resetAt time.Time) int {
	if resetAt.IsZero() {
		return 60 // 預設等 60 秒
	}
	seconds := int(time.Until(resetAt).Seconds())
	if seconds < 0 {
		return 0
	}
	return seconds
}
