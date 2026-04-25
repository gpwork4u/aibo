package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// stubGcalRepo 為 F-030b handler 測試用的 fake repository（純 in-memory）。
type stubGcalRepo struct {
	current *model.GcalIntegration
}

func (s *stubGcalRepo) Get(ctx context.Context) (*model.GcalIntegration, error) {
	return s.current, nil
}
func (s *stubGcalRepo) Upsert(ctx context.Context, integration *model.GcalIntegration) error {
	s.current = integration
	return nil
}
func (s *stubGcalRepo) UpdateTokens(ctx context.Context, id interface{}, accessToken, refreshToken string, expiry interface{}) error {
	return nil
}
func (s *stubGcalRepo) UpdateDefaultCalendarID(ctx context.Context, id uuid.UUID, calendarID string) error {
	if s.current != nil {
		s.current.DefaultCalendarID = calendarID
	}
	return nil
}
func (s *stubGcalRepo) DeleteAll(ctx context.Context) error {
	s.current = nil
	return nil
}
func (s *stubGcalRepo) SaveOAuthState(ctx context.Context, state string) error { return nil }
func (s *stubGcalRepo) ValidateOAuthState(ctx context.Context, state string) (bool, error) {
	return true, nil
}
func (s *stubGcalRepo) CleanExpiredOAuthStates(ctx context.Context) error { return nil }

func setupGcalHandler(t *testing.T, repo *stubGcalRepo) (*gin.Engine, *GcalHandler) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	aes, err := crypto.NewAESCryptoWithKey(make([]byte, 32))
	if err != nil {
		t.Fatalf("crypto: %v", err)
	}
	svc := service.NewGcalService(repo, nil, aes, &service.GcalConfig{
		ClientID:     "cid",
		ClientSecret: "csec",
		RedirectURL:  "http://localhost/cb",
	})
	h := NewGcalHandler(svc)

	r := gin.New()
	g := r.Group("/api/v1/integrations")
	g.GET("/gcal/status", h.GetStatus)
	g.PUT("/gcal/settings", h.UpdateSettings)
	g.DELETE("/gcal", h.Disconnect)
	return r, h
}

func TestGcalHandler_GetStatus_NotConnected(t *testing.T) {
	repo := &stubGcalRepo{current: nil}
	r, _ := setupGcalHandler(t, repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/integrations/gcal/status", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
	var resp dto.GcalStatusResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Connected {
		t.Errorf("connected = true, want false")
	}
}

func TestGcalHandler_GetStatus_Connected(t *testing.T) {
	expires := time.Date(2026, 4, 24, 11, 0, 0, 0, time.UTC)
	repo := &stubGcalRepo{
		current: &model.GcalIntegration{
			ID:                   uuid.New(),
			Email:                "user@example.com",
			TokenExpiry:          expires,
			AccessTokenExpiresAt: &expires,
			DefaultCalendarID:    "primary",
			CreatedAt:            time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC),
		},
	}
	r, _ := setupGcalHandler(t, repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/integrations/gcal/status", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
	var resp dto.GcalStatusResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !resp.Connected {
		t.Errorf("connected = false")
	}
	if resp.Email != "user@example.com" {
		t.Errorf("email = %s", resp.Email)
	}
	if resp.DefaultCalendarID != "primary" {
		t.Errorf("default = %s", resp.DefaultCalendarID)
	}
}

func TestGcalHandler_UpdateSettings_NotConnected(t *testing.T) {
	repo := &stubGcalRepo{current: nil}
	r, _ := setupGcalHandler(t, repo)

	body, _ := json.Marshal(dto.GcalUpdateSettingsRequest{DefaultCalendarID: "primary"})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/integrations/gcal/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusFailedDependency {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
	var errResp dto.ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &errResp)
	if errResp.Code != model.ErrCodeGcalNotConnected {
		t.Errorf("code = %s", errResp.Code)
	}
}

func TestGcalHandler_UpdateSettings_OK(t *testing.T) {
	repo := &stubGcalRepo{
		current: &model.GcalIntegration{
			ID:                uuid.New(),
			Email:             "u@example.com",
			DefaultCalendarID: "primary",
			CreatedAt:         time.Now(),
			TokenExpiry:       time.Now().Add(time.Hour),
		},
	}
	r, _ := setupGcalHandler(t, repo)

	body, _ := json.Marshal(dto.GcalUpdateSettingsRequest{DefaultCalendarID: "work@group.calendar.google.com"})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/integrations/gcal/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
	var resp dto.GcalStatusResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.DefaultCalendarID != "work@group.calendar.google.com" {
		t.Errorf("default = %s", resp.DefaultCalendarID)
	}
	if repo.current.DefaultCalendarID != "work@group.calendar.google.com" {
		t.Errorf("repo not updated: %s", repo.current.DefaultCalendarID)
	}
}

func TestGcalHandler_UpdateSettings_EmptyInput(t *testing.T) {
	repo := &stubGcalRepo{
		current: &model.GcalIntegration{ID: uuid.New(), CreatedAt: time.Now()},
	}
	r, _ := setupGcalHandler(t, repo)

	body, _ := json.Marshal(dto.GcalUpdateSettingsRequest{DefaultCalendarID: ""})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/integrations/gcal/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestGcalHandler_UpdateSettings_BadJSON(t *testing.T) {
	repo := &stubGcalRepo{}
	r, _ := setupGcalHandler(t, repo)

	req := httptest.NewRequest(http.MethodPut, "/api/v1/integrations/gcal/settings", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d", rec.Code)
	}
}

func TestGcalHandler_Disconnect_OK(t *testing.T) {
	repo := &stubGcalRepo{
		current: &model.GcalIntegration{ID: uuid.New(), CreatedAt: time.Now()},
	}
	r, _ := setupGcalHandler(t, repo)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/integrations/gcal", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.current != nil {
		t.Error("integration should be cleared")
	}

	// 後續 GET status 應為 not connected
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/integrations/gcal/status", nil)
	rec2 := httptest.NewRecorder()
	r.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("status after disconnect = %d", rec2.Code)
	}
	var resp dto.GcalStatusResponse
	_ = json.Unmarshal(rec2.Body.Bytes(), &resp)
	if resp.Connected {
		t.Error("after disconnect, connected should be false")
	}
}

func TestGcalHandler_Disconnect_Idempotent(t *testing.T) {
	repo := &stubGcalRepo{current: nil}
	r, _ := setupGcalHandler(t, repo)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/integrations/gcal", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Errorf("status = %d", rec.Code)
	}
}
