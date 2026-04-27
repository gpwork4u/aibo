package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

const (
	// githubAPIBase GitHub REST API 基礎 URL
	githubAPIBase = "https://api.github.com"

	// githubAPITimeout GitHub API 呼叫最大等待時間（spec 規定 10s）
	githubAPITimeout = 10 * time.Second

	// redactPrefixLen PAT redact 時保留的前段字元數
	redactPrefixLen = 4

	// redactSuffixLen PAT redact 時保留的後段字元數
	redactSuffixLen = 4
)

// GitHubIntegrationService GitHub PAT 整合業務邏輯
type GitHubIntegrationService struct {
	repo       *repository.GitHubIntegrationRepository
	crypto     *crypto.AESCrypto
	httpClient *http.Client
}

// NewGitHubIntegrationService 建立新的 GitHubIntegrationService
func NewGitHubIntegrationService(
	repo *repository.GitHubIntegrationRepository,
	aesCrypto *crypto.AESCrypto,
) *GitHubIntegrationService {
	return &GitHubIntegrationService{
		repo:   repo,
		crypto: aesCrypto,
		httpClient: &http.Client{
			Timeout: githubAPITimeout,
		},
	}
}

// githubUserResponse GitHub GET /user API 回應結構
type githubUserResponse struct {
	Login string `json:"login"`
}

// ConnectResult Connect() 成功時的回傳資料
type ConnectResult struct {
	Username string
	Scopes   []string
}

// Connect 驗證 PAT 並儲存整合設定
//
// 流程：
//  1. 用 PAT 呼叫 GitHub GET /user 驗證有效性並取得 username
//  2. 從 X-OAuth-Scopes header 解析 scopes
//  3. 加密 PAT 後 Upsert 到 DB
//
// 錯誤：
//   - 401 → model.AppError{Code: ErrCodeGitHubTokenInvalid}
//   - 403（scope 不足）→ model.AppError{Code: ErrCodeGitHubInsufficientScope}
//   - GitHub 不可達 → model.AppError{Code: ErrCodeGitHubUnavailable}
func (s *GitHubIntegrationService) Connect(ctx context.Context, pat string) (*ConnectResult, error) {
	// 安全日誌：PAT 只印 redacted 版本
	slog.Info("GitHub PAT 連接請求", "token", redactToken(pat))

	// 呼叫 GitHub GET /user
	user, scopes, err := s.fetchGitHubUser(ctx, pat)
	if err != nil {
		return nil, err
	}

	slog.Info("GitHub 使用者驗證成功", "username", user.Login, "scopes", scopes)

	// 加密 PAT
	encrypted, err := s.crypto.Encrypt(pat)
	if err != nil {
		return nil, fmt.Errorf("加密 PAT 失敗: %w", err)
	}

	// 準備 model
	integration := &model.GitHubIntegration{
		ID:             uuid.New(),
		Username:       user.Login,
		TokenEncrypted: encrypted,
		Scopes:         scopes,
	}

	// Upsert（覆蓋同一 username 的舊記錄）
	if err := s.repo.Upsert(ctx, integration); err != nil {
		return nil, fmt.Errorf("儲存 GitHub 整合設定失敗: %w", err)
	}

	return &ConnectResult{
		Username: user.Login,
		Scopes:   scopes,
	}, nil
}

// GetStatus 取得目前 GitHub 整合狀態
//
// 若尚未連接，回傳 connected=false 且 integration=nil。
// 若已連接，回傳 connected=true 及整合資訊（不含明文 token）。
func (s *GitHubIntegrationService) GetStatus(ctx context.Context) (connected bool, integration *model.GitHubIntegration, err error) {
	gi, err := s.repo.Get(ctx)
	if err != nil {
		return false, nil, fmt.Errorf("查詢 GitHub 整合狀態失敗: %w", err)
	}
	if gi == nil {
		return false, nil, nil
	}
	return true, gi, nil
}

// Disconnect 刪除 GitHub 整合設定（中斷連線）
//
// 若尚未設定則回傳 model.AppError{Code: ErrCodeGitHubNotConnected}。
func (s *GitHubIntegrationService) Disconnect(ctx context.Context) error {
	err := s.repo.Delete(ctx)
	if err != nil {
		// pgx.ErrNoRows 對應「尚未連接」
		if err.Error() == "no rows in result set" {
			return &model.AppError{
				Status:  http.StatusNotFound,
				Code:    model.ErrCodeGitHubNotConnected,
				Message: "尚未設定 GitHub 整合",
			}
		}
		return fmt.Errorf("刪除 GitHub 整合設定失敗: %w", err)
	}
	slog.Info("GitHub 整合已中斷連線")
	return nil
}

// DecryptToken 解密儲存的 PAT（供其他 service 使用，例如 commit sync）
//
// 若尚未連接回傳 ErrCodeGitHubNotConnected。
func (s *GitHubIntegrationService) DecryptToken(ctx context.Context) (string, error) {
	gi, err := s.repo.Get(ctx)
	if err != nil {
		return "", fmt.Errorf("查詢 GitHub 整合失敗: %w", err)
	}
	if gi == nil {
		return "", &model.AppError{
			Status:  http.StatusNotFound,
			Code:    model.ErrCodeGitHubNotConnected,
			Message: "尚未設定 GitHub 整合",
		}
	}

	plaintext, err := s.crypto.Decrypt(gi.TokenEncrypted)
	if err != nil {
		return "", fmt.Errorf("解密 PAT 失敗: %w", err)
	}
	return plaintext, nil
}

// fetchGitHubUser 呼叫 GitHub GET /user，回傳使用者資訊與 scopes
func (s *GitHubIntegrationService) fetchGitHubUser(ctx context.Context, pat string) (*githubUserResponse, []string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, githubAPIBase+"/user", nil)
	if err != nil {
		return nil, nil, fmt.Errorf("建立 GitHub API 請求失敗: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+pat)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		slog.Error("GitHub API 連線失敗", "error", err)
		return nil, nil, &model.AppError{
			Status:  http.StatusServiceUnavailable,
			Code:    model.ErrCodeGitHubUnavailable,
			Message: "無法連線到 GitHub API，請稍後再試",
		}
	}
	defer resp.Body.Close()

	// 處理錯誤狀態碼
	switch resp.StatusCode {
	case http.StatusOK:
		// 繼續處理
	case http.StatusUnauthorized:
		slog.Warn("GitHub PAT 無效", "status", resp.StatusCode, "token", redactToken(pat))
		return nil, nil, &model.AppError{
			Status:  http.StatusUnprocessableEntity,
			Code:    model.ErrCodeGitHubTokenInvalid,
			Message: "GitHub Personal Access Token 無效或已過期",
		}
	case http.StatusForbidden:
		slog.Warn("GitHub PAT scope 不足", "status", resp.StatusCode, "token", redactToken(pat))
		return nil, nil, &model.AppError{
			Status:  http.StatusUnprocessableEntity,
			Code:    model.ErrCodeGitHubInsufficientScope,
			Message: "GitHub Personal Access Token 缺少必要的存取權限",
		}
	default:
		slog.Error("GitHub API 回傳非預期狀態碼", "status", resp.StatusCode)
		return nil, nil, &model.AppError{
			Status:  http.StatusServiceUnavailable,
			Code:    model.ErrCodeGitHubUnavailable,
			Message: fmt.Sprintf("GitHub API 回傳錯誤狀態: %d", resp.StatusCode),
		}
	}

	// 解析 scopes（X-OAuth-Scopes: "repo, user, read:org"）
	scopes := parseScopes(resp.Header.Get("X-OAuth-Scopes"))

	// 解析回應 body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("讀取 GitHub API 回應失敗: %w", err)
	}

	var user githubUserResponse
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, nil, fmt.Errorf("解析 GitHub API 回應失敗: %w", err)
	}

	if user.Login == "" {
		return nil, nil, fmt.Errorf("GitHub API 回應缺少 login 欄位")
	}

	return &user, scopes, nil
}

// parseScopes 解析 X-OAuth-Scopes header 成字串陣列
// 例："repo, user, read:org" → ["repo", "user", "read:org"]
func parseScopes(scopeHeader string) []string {
	if scopeHeader == "" {
		return []string{}
	}
	parts := strings.Split(scopeHeader, ",")
	scopes := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			scopes = append(scopes, trimmed)
		}
	}
	return scopes
}

// redactToken 將 PAT 轉成 redacted 格式（前 4 + *** + 後 4）
// 例："ghp_abcdefghij1234" → "ghp_***1234"
func redactToken(token string) string {
	if len(token) <= redactPrefixLen+redactSuffixLen {
		return "***"
	}
	return token[:redactPrefixLen] + "***" + token[len(token)-redactSuffixLen:]
}
