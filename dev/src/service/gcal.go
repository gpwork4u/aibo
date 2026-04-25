package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/dto"
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
		return nil, detectReauthError(err)
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
		return nil, mapGcalAPIError(err)
	}
	return events.Items, nil
}

// detectReauthError 將 oauth2 token refresh 錯誤轉成 AppError。
//
// 偵測 *oauth2.RetrieveError + ErrorCode == "invalid_grant"（refresh token 已撤銷）
// 或文字含 "invalid_grant"，回 401 GCAL_REAUTH_REQUIRED；其餘 refresh 失敗仍視為
// 需要重新授權（保險起見一律走 reauth），但保留 GCAL_TOKEN_EXPIRED 給呼叫端區分。
//
// 注意：此函式回傳的錯誤一律是 *model.AppError，handler 透過既有 type assertion
// 即可拿到正確的 status / code。
func detectReauthError(err error) error {
	if err == nil {
		return nil
	}
	var retrieveErr *oauth2.RetrieveError
	if errors.As(err, &retrieveErr) {
		// invalid_grant：refresh token 已撤銷或失效，必須重新授權
		if retrieveErr.ErrorCode == "invalid_grant" {
			return model.NewAppError(http.StatusUnauthorized, model.ErrCodeGcalReauthRequired, "Refresh token 失效，請重新授權")
		}
		// 其他 OAuth2 錯誤（invalid_client、unauthorized_client...）也視為需要重新授權
		return model.NewAppError(http.StatusUnauthorized, model.ErrCodeGcalReauthRequired, "OAuth refresh 失敗，請重新授權: "+retrieveErr.ErrorCode)
	}
	// 非 RetrieveError 的 refresh 錯誤（例如網路錯誤）一律 401 token expired，
	// 提示使用者重新授權即可恢復。
	return model.NewAppError(http.StatusUnauthorized, model.ErrCodeGcalTokenExpired, "Token 過期且 refresh 失敗，請重新授權")
}

// ListEventsWithLinks 在 ListEvents 之上補上 linked_entry_id：
// 對每筆 event 查 entries 表，若已有對應 entry（source_type='gcal' + source_ref=event.Id）
// 則回填 entry ID；否則回 uuid.Nil。
//
// 用於 F-030c 的 GET /api/v1/integrations/gcal/events 對外端點，
// 讓前端能直接判斷哪些 gcal event 已轉成 entry。
func (s *GcalService) ListEventsWithLinks(
	ctx context.Context,
	calendarID string,
	since, until time.Time,
	singleEvents bool,
) ([]GcalEventWithLink, error) {
	items, err := s.ListEvents(ctx, calendarID, since, until, singleEvents)
	if err != nil {
		return nil, err
	}

	out := make([]GcalEventWithLink, 0, len(items))
	for _, ev := range items {
		linked, lookupErr := s.entryRepo.GetByGcalRef(ctx, ev.Id)
		if lookupErr != nil {
			// 不致命：紀錄後當作未連結
			slog.WarnContext(ctx, "查 entry by gcal_ref 失敗", "gcal_id", ev.Id, "error", lookupErr)
			linked = uuid.Nil
		}
		out = append(out, GcalEventWithLink{Event: ev, LinkedEntryID: linked})
	}
	return out, nil
}

// GcalEventWithLink 是 *calendar.Event 加上對應的 entry ID（若已轉成 entry）。
type GcalEventWithLink struct {
	Event         *calendar.Event
	LinkedEntryID uuid.UUID
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
		return nil, detectReauthError(err)
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

// GetStatus 回傳目前 Google Calendar 連線狀態（F-030b）。
//
// 未連 → `{Connected:false}`；已連 → 補齊 email / connected_at /
// access_token_expires_at / default_calendar_id。
//
// `AccessTokenExpiresAt` 採新欄位優先，若 nil 則 fallback 至既有 `TokenExpiry`。
func (s *GcalService) GetStatus(ctx context.Context) (*dto.GcalStatusResponse, error) {
	integration, err := s.gcalRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("查詢 GcalIntegration 失敗: %w", err)
	}
	if integration == nil {
		return &dto.GcalStatusResponse{Connected: false}, nil
	}

	connectedAt := integration.CreatedAt.UTC().Format(time.RFC3339)

	var expiresStr string
	if integration.AccessTokenExpiresAt != nil && !integration.AccessTokenExpiresAt.IsZero() {
		expiresStr = integration.AccessTokenExpiresAt.UTC().Format(time.RFC3339)
	} else if !integration.TokenExpiry.IsZero() {
		expiresStr = integration.TokenExpiry.UTC().Format(time.RFC3339)
	}

	defaultCal := integration.DefaultCalendarID
	if defaultCal == "" {
		defaultCal = "primary"
	}

	resp := &dto.GcalStatusResponse{
		Connected:         true,
		Email:             integration.Email,
		ConnectedAt:       &connectedAt,
		DefaultCalendarID: defaultCal,
	}
	if expiresStr != "" {
		resp.AccessTokenExpiresAt = &expiresStr
	}
	return resp, nil
}

// ListCalendars 列出目前已授權使用者可選的 Google Calendar 列表（F-030b）。
//
// 錯誤映射：
//   - 未連 → AppError{424, GCAL_NOT_CONNECTED}
//   - refresh token 失效 → AppError{401, GCAL_REAUTH_REQUIRED}
//   - 其他 Google API 錯誤 → AppError{502, GCAL_UPSTREAM_ERROR}
func (s *GcalService) ListCalendars(ctx context.Context) ([]*dto.GcalCalendar, error) {
	srv, err := s.calendarServiceForCurrent(ctx)
	if err != nil {
		return nil, err
	}

	list, err := srv.CalendarList.List().Context(ctx).Do()
	if err != nil {
		return nil, mapGcalAPIError(err)
	}

	out := make([]*dto.GcalCalendar, 0, len(list.Items))
	for _, item := range list.Items {
		out = append(out, &dto.GcalCalendar{
			ID:       item.Id,
			Summary:  item.Summary,
			Primary:  item.Primary,
			TimeZone: item.TimeZone,
		})
	}
	return out, nil
}

// UpdateDefaultCalendar 更新使用者選定的預設日曆 ID（F-030b）。
//
// 空字串視為 invalid input；未連 → AppError{424, GCAL_NOT_CONNECTED}。
func (s *GcalService) UpdateDefaultCalendar(ctx context.Context, calendarID string) (*dto.GcalStatusResponse, error) {
	if calendarID == "" {
		return nil, model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "default_calendar_id 為必填")
	}

	integration, err := s.gcalRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("查詢 GcalIntegration 失敗: %w", err)
	}
	if integration == nil {
		return nil, model.NewAppError(http.StatusFailedDependency, model.ErrCodeGcalNotConnected, "Google Calendar 尚未授權")
	}

	if err := s.gcalRepo.UpdateDefaultCalendarID(ctx, integration.ID, calendarID); err != nil {
		return nil, fmt.Errorf("更新 default_calendar_id 失敗: %w", err)
	}

	slog.Info("Google Calendar 預設日曆已更新", "default_calendar_id", calendarID)
	return s.GetStatus(ctx)
}

// Disconnect 中斷 Google Calendar 連線（F-030b）。
//
// 直接清除 token（gcalRepo.DeleteAll），不嘗試呼叫 Google revoke endpoint。
// 已轉換的 entries 保留（不在本層處理）。Idempotent：未連時也回 nil。
func (s *GcalService) Disconnect(ctx context.Context) error {
	if err := s.gcalRepo.DeleteAll(ctx); err != nil {
		return fmt.Errorf("中斷 Google Calendar 連線失敗: %w", err)
	}
	slog.Info("Google Calendar 連線已中斷")
	return nil
}

// calendarServiceForCurrent 為目前已連使用者建立可自動 refresh 的 calendar.Service。
//
// 與 ListEvents / GetEvent 同樣的 token refresh 路徑，差別在於將 refresh 失敗映射為
// F-030 規格的 `GCAL_REAUTH_REQUIRED`（401），而不是既有的 `GCAL_TOKEN_EXPIRED`。
func (s *GcalService) calendarServiceForCurrent(ctx context.Context) (*calendar.Service, error) {
	integration, err := s.gcalRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("查詢 GcalIntegration 失敗: %w", err)
	}
	if integration == nil {
		return nil, model.NewAppError(http.StatusFailedDependency, model.ErrCodeGcalNotConnected, "Google Calendar 尚未授權")
	}

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
		return nil, model.NewAppError(http.StatusUnauthorized, model.ErrCodeGcalReauthRequired, "Refresh token 失效，請重新授權")
	}

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
	return srv, nil
}

// generateRandomState 產生隨機 state 字串
func generateRandomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

