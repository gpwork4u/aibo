package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/model"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

// 錯誤碼定義於 model.ErrCodeGcalNotConnected 和 model.ErrCodeGcalTokenExpired

// GcalConfig Google OAuth 設定
type GcalConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// GcalService Google Calendar 整合服務
type GcalService struct {
	gcalRepo  GcalIntegrationRepository
	entryRepo EntryRepository
	aesCrypto *crypto.AESCrypto
	config    *GcalConfig
}

// NewGcalService 建立新的 GcalService
func NewGcalService(
	gcalRepo GcalIntegrationRepository,
	entryRepo EntryRepository,
	aesCrypto *crypto.AESCrypto,
	config *GcalConfig,
) *GcalService {
	return &GcalService{
		gcalRepo:  gcalRepo,
		entryRepo: entryRepo,
		aesCrypto: aesCrypto,
		config:    config,
	}
}

// oauthConfig 建立 OAuth2 Config
func (s *GcalService) oauthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     s.config.ClientID,
		ClientSecret: s.config.ClientSecret,
		RedirectURL:  s.config.RedirectURL,
		Scopes:       []string{calendar.CalendarReadonlyScope},
		Endpoint:     google.Endpoint,
	}
}

// StartOAuth 開始 OAuth 授權流程，回傳 auth_url
// OAuth state 持久化到 DB，server 重啟後仍可驗證
func (s *GcalService) StartOAuth() (string, error) {
	if s.config.ClientID == "" || s.config.ClientSecret == "" {
		return "", model.NewAppError(http.StatusInternalServerError, "INTERNAL_ERROR", "Google OAuth client 未設定")
	}

	state, err := generateRandomState()
	if err != nil {
		return "", fmt.Errorf("產生 state 失敗: %w", err)
	}

	// 儲存 state 到 DB（持久化，重啟後不遺失）
	ctx := context.Background()
	if err := s.gcalRepo.SaveOAuthState(ctx, state); err != nil {
		return "", fmt.Errorf("儲存 OAuth state 失敗: %w", err)
	}

	// 背景清理過期 states
	go func() {
		if cleanErr := s.gcalRepo.CleanExpiredOAuthStates(context.Background()); cleanErr != nil {
			slog.Error("清理過期 OAuth states 失敗", "error", cleanErr)
		}
	}()

	authURL := s.oauthConfig().AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	return authURL, nil
}

// HandleCallback 處理 OAuth callback
func (s *GcalService) HandleCallback(ctx context.Context, code, state string) (string, error) {
	// 驗證 state（從 DB 查詢並刪除，同時檢查是否過期）
	valid, err := s.gcalRepo.ValidateOAuthState(ctx, state)
	if err != nil {
		return "", fmt.Errorf("驗證 OAuth state 失敗: %w", err)
	}
	if !valid {
		return "", model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "無效或已過期的 state 參數")
	}

	// 交換 code 取得 token
	oauthCfg := s.oauthConfig()
	token, err := oauthCfg.Exchange(ctx, code)
	if err != nil {
		return "", model.NewAppError(http.StatusInternalServerError, "INTERNAL_ERROR", "token 交換失敗: "+err.Error())
	}

	// 使用 token 取得使用者 email
	client := oauthCfg.Client(ctx, token)
	srv, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return "", model.NewAppError(http.StatusInternalServerError, "INTERNAL_ERROR", "建立 Calendar service 失敗: "+err.Error())
	}

	calendarEntry, err := srv.Calendars.Get("primary").Do()
	if err != nil {
		return "", model.NewAppError(http.StatusInternalServerError, "INTERNAL_ERROR", "取得 Calendar 資訊失敗: "+err.Error())
	}

	email := calendarEntry.Id // primary calendar 的 ID 就是 email

	// 加密 token
	encClientSecret, err := s.aesCrypto.Encrypt(s.config.ClientSecret)
	if err != nil {
		return "", fmt.Errorf("加密 client_secret 失敗: %w", err)
	}
	encAccessToken, err := s.aesCrypto.Encrypt(token.AccessToken)
	if err != nil {
		return "", fmt.Errorf("加密 access_token 失敗: %w", err)
	}
	encRefreshToken, err := s.aesCrypto.Encrypt(token.RefreshToken)
	if err != nil {
		return "", fmt.Errorf("加密 refresh_token 失敗: %w", err)
	}

	// 儲存（upsert，覆蓋舊的）
	integration := &model.GcalIntegration{
		ID:           uuid.New(),
		Email:        email,
		ClientID:     s.config.ClientID,
		ClientSecret: encClientSecret,
		AccessToken:  encAccessToken,
		RefreshToken: encRefreshToken,
		TokenExpiry:  token.Expiry,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.gcalRepo.Upsert(ctx, integration); err != nil {
		return "", fmt.Errorf("儲存 GcalIntegration 失敗: %w", err)
	}

	slog.Info("Google Calendar 連線成功", "email", email)
	return email, nil
}

// IsConnected 判斷目前是否已完成 Google Calendar OAuth 授權。
//
// 回傳 (true, nil) 代表已連；(false, nil) 代表尚未連（可引導前端至設定頁）。
// 若 DB 查詢失敗會回 error。
func (s *GcalService) IsConnected(ctx context.Context) (bool, error) {
	integration, err := s.gcalRepo.Get(ctx)
	if err != nil {
		return false, fmt.Errorf("查詢 GcalIntegration 失敗: %w", err)
	}
	return integration != nil, nil
}

// ListEvents 以目前已授權使用者的身份，列出指定區間的 Google Calendar 事件（read-through）。
//
// 行為：
//   - 若未連 gcal，回 AppError(401, GCAL_NOT_CONNECTED)；handler 可依需求轉換狀態碼。
//   - 若 refresh token 失敗，回 AppError(401, GCAL_TOKEN_EXPIRED)。
//   - 其他 upstream 錯誤以 wrapped error 回傳，handler 可在允許時走 degraded。
//   - 不會寫入 DB，也不會建立 entry（與 ImportEvents 的差異）。
//
// 參數：
//   - calendarID：Google Calendar ID，通常為 "primary"
//   - since/until：查詢區間（傳給 Google API 的 timeMin/timeMax）
//   - singleEvents：是否展開 recurring event
func (s *GcalService) ListEvents(
	ctx context.Context,
	calendarID string,
	since, until time.Time,
	singleEvents bool,
) ([]*calendar.Event, error) {
	// 取得整合資訊
	integration, err := s.gcalRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("查詢 GcalIntegration 失敗: %w", err)
	}
	if integration == nil {
		return nil, model.NewAppError(http.StatusUnauthorized, model.ErrCodeGcalNotConnected, "Google Calendar 尚未授權")
	}

	// 解密 tokens
	accessToken, err := s.aesCrypto.Decrypt(integration.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("解密 access_token 失敗: %w", err)
	}
	refreshToken, err := s.aesCrypto.Decrypt(integration.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("解密 refresh_token 失敗: %w", err)
	}
	clientSecret, err := s.aesCrypto.Decrypt(integration.ClientSecret)
	if err != nil {
		return nil, fmt.Errorf("解密 client_secret 失敗: %w", err)
	}

	// 建立 OAuth2 token
	token := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		Expiry:       integration.TokenExpiry,
	}

	// 建立 OAuth config（使用儲存的 client_id/secret）
	oauthCfg := &oauth2.Config{
		ClientID:     integration.ClientID,
		ClientSecret: clientSecret,
		RedirectURL:  s.config.RedirectURL,
		Scopes:       []string{calendar.CalendarReadonlyScope},
		Endpoint:     google.Endpoint,
	}

	// 建立可自動 refresh 的 HTTP client
	tokenSource := oauthCfg.TokenSource(ctx, token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return nil, model.NewAppError(http.StatusUnauthorized, model.ErrCodeGcalTokenExpired, "Token 過期且 refresh 失敗，請重新授權")
	}

	// 如果 token 被 refresh 了，更新到 DB
	if newToken.AccessToken != accessToken {
		slog.Info("Google Calendar token 已自動 refresh")
		encNewAccess, encErr := s.aesCrypto.Encrypt(newToken.AccessToken)
		if encErr == nil {
			encNewRefresh := integration.RefreshToken // 預設用原來的
			if newToken.RefreshToken != "" && newToken.RefreshToken != refreshToken {
				encNewRefresh, _ = s.aesCrypto.Encrypt(newToken.RefreshToken)
			}
			_ = s.gcalRepo.UpdateTokens(ctx, integration.ID, encNewAccess, encNewRefresh, newToken.Expiry)
		}
	}

	// 建立 Calendar service
	client := oauth2.NewClient(ctx, tokenSource)
	srv, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("建立 Calendar service 失敗: %w", err)
	}

	// 列出事件
	call := srv.Events.List(calendarID).
		TimeMin(since.Format(time.RFC3339)).
		TimeMax(until.Format(time.RFC3339)).
		SingleEvents(singleEvents).
		OrderBy("startTime").
		MaxResults(500)

	events, err := call.Do()
	if err != nil {
		return nil, fmt.Errorf("列出 Calendar 事件失敗: %w", err)
	}
	return events.Items, nil
}

// ImportEvents 匯入 Google Calendar 事件
func (s *GcalService) ImportEvents(ctx context.Context, calendarID string, since, until time.Time, includeRecurring bool) (eventsFound, entriesCreated, entriesSkipped int, err error) {
	items, err := s.ListEvents(ctx, calendarID, since, until, includeRecurring)
	if err != nil {
		return 0, 0, 0, err
	}

	eventsFound = len(items)

	// 逐筆匯入
	for _, event := range items {
		// 跳過無 summary 的事件
		if event.Summary == "" {
			entriesSkipped++
			continue
		}

		// 檢查去重：source_type="gcal" + source_ref=event ID
		sourceType := "gcal"
		exists, err := s.entryRepo.ExistsBySourceRef(ctx, sourceType, event.Id)
		if err != nil {
			slog.Error("檢查事件去重失敗", "event_id", event.Id, "error", err)
			entriesSkipped++
			continue
		}
		if exists {
			entriesSkipped++
			continue
		}

		// 建立 Entry
		title := "[GCal] " + event.Summary
		content := buildEventContent(event)
		tags := []string{"gcal", "meeting"}
		source := calendarID

		entry := &model.Entry{
			ID:         uuid.New(),
			Title:      &title,
			Content:    &content,
			Source:     &source,
			SourceType: &sourceType,
			SourceRef:  &event.Id,
			Tags:       tags,
			IsArchived: false,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		if err := s.entryRepo.Create(ctx, entry); err != nil {
			slog.Error("建立 entry 失敗", "event_id", event.Id, "error", err)
			entriesSkipped++
			continue
		}

		entriesCreated++
	}

	slog.Info("Google Calendar 匯入完成",
		"events_found", eventsFound,
		"entries_created", entriesCreated,
		"entries_skipped", entriesSkipped,
	)

	return eventsFound, entriesCreated, entriesSkipped, nil
}

// GetEvent 取得指定 calendar 上的單一 event。
//
// 錯誤映射：
//   - 使用者尚未連 gcal → model.AppError{424, GCAL_NOT_CONNECTED}
//   - token 過期且 refresh 失敗 → model.AppError{401, GCAL_TOKEN_EXPIRED}
//   - Google API 回 404 → model.AppError{404, EVENT_NOT_FOUND}
//   - 其他 Google API 錯誤 → model.AppError{502, GCAL_UPSTREAM_ERROR}
//
// 回傳的 *calendar.Event 為 Google API 原始型別，由呼叫端（service 層）自行組裝成 entry。
func (s *GcalService) GetEvent(ctx context.Context, calendarID, eventID string) (*calendar.Event, error) {
	if calendarID == "" {
		calendarID = "primary"
	}

	// 取得整合資訊
	integration, err := s.gcalRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("查詢 GcalIntegration 失敗: %w", err)
	}
	if integration == nil {
		return nil, model.NewAppError(http.StatusFailedDependency, model.ErrCodeGcalNotConnected, "Google Calendar 尚未授權")
	}

	// 解密 tokens
	accessToken, err := s.aesCrypto.Decrypt(integration.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("解密 access_token 失敗: %w", err)
	}
	refreshToken, err := s.aesCrypto.Decrypt(integration.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("解密 refresh_token 失敗: %w", err)
	}
	clientSecret, err := s.aesCrypto.Decrypt(integration.ClientSecret)
	if err != nil {
		return nil, fmt.Errorf("解密 client_secret 失敗: %w", err)
	}

	token := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		Expiry:       integration.TokenExpiry,
	}
	oauthCfg := &oauth2.Config{
		ClientID:     integration.ClientID,
		ClientSecret: clientSecret,
		RedirectURL:  s.config.RedirectURL,
		Scopes:       []string{calendar.CalendarReadonlyScope},
		Endpoint:     google.Endpoint,
	}

	tokenSource := oauthCfg.TokenSource(ctx, token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return nil, model.NewAppError(http.StatusUnauthorized, model.ErrCodeGcalTokenExpired, "Token 過期且 refresh 失敗，請重新授權")
	}

	// refresh 後持久化
	if newToken.AccessToken != accessToken {
		slog.Info("Google Calendar token 已自動 refresh")
		encNewAccess, encErr := s.aesCrypto.Encrypt(newToken.AccessToken)
		if encErr == nil {
			encNewRefresh := integration.RefreshToken
			if newToken.RefreshToken != "" && newToken.RefreshToken != refreshToken {
				encNewRefresh, _ = s.aesCrypto.Encrypt(newToken.RefreshToken)
			}
			_ = s.gcalRepo.UpdateTokens(ctx, integration.ID, encNewAccess, encNewRefresh, newToken.Expiry)
		}
	}

	client := oauth2.NewClient(ctx, tokenSource)
	srv, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("建立 Calendar service 失敗: %w", err)
	}

	event, err := srv.Events.Get(calendarID, eventID).Context(ctx).Do()
	if err != nil {
		return nil, mapGcalAPIError(err)
	}
	return event, nil
}

// mapGcalAPIError 將 Google API 錯誤對應到 AppError。
//
// 404 → EVENT_NOT_FOUND；其餘 → GCAL_UPSTREAM_ERROR 502。
func mapGcalAPIError(err error) error {
	if err == nil {
		return nil
	}
	if gErr, ok := err.(*googleapi.Error); ok {
		if gErr.Code == http.StatusNotFound {
			return model.NewAppError(http.StatusNotFound, model.ErrCodeEventNotFound, "Google Calendar 找不到該 event")
		}
		return model.NewAppError(http.StatusBadGateway, model.ErrCodeGcalUpstream, fmt.Sprintf("Google Calendar API 錯誤: %d %s", gErr.Code, gErr.Message))
	}
	return model.NewAppError(http.StatusBadGateway, model.ErrCodeGcalUpstream, "Google Calendar API 錯誤: "+err.Error())
}

// buildEventContent 建構事件內容
func buildEventContent(event *calendar.Event) string {
	content := ""

	// 時間
	start := ""
	end := ""
	if event.Start != nil {
		if event.Start.DateTime != "" {
			start = event.Start.DateTime
		} else {
			start = event.Start.Date
		}
	}
	if event.End != nil {
		if event.End.DateTime != "" {
			end = event.End.DateTime
		} else {
			end = event.End.Date
		}
	}
	if start != "" || end != "" {
		content += fmt.Sprintf("時間: %s ~ %s\n", start, end)
	}

	// 地點
	if event.Location != "" {
		content += fmt.Sprintf("地點: %s\n", event.Location)
	}

	// 描述
	if event.Description != "" {
		content += "\n" + event.Description
	}

	return content
}

// generateRandomState 產生隨機 state 字串
func generateRandomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

