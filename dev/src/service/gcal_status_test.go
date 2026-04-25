package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/model"
)

// fakeGcalRepo 只實作 F-030b 測試會用到的方法；其他方法回傳零值或 nil。
type fakeGcalRepo struct {
	got                  *model.GcalIntegration
	getErr               error
	updateDefaultCalled  bool
	updateDefaultID      uuid.UUID
	updateDefaultArg     string
	updateDefaultErr     error
	deleteAllCalled      bool
	deleteAllErr         error
}

func (f *fakeGcalRepo) Get(ctx context.Context) (*model.GcalIntegration, error) {
	return f.got, f.getErr
}
func (f *fakeGcalRepo) Upsert(ctx context.Context, integration *model.GcalIntegration) error {
	return nil
}
func (f *fakeGcalRepo) UpdateTokens(ctx context.Context, id interface{}, accessToken, refreshToken string, expiry interface{}) error {
	return nil
}
func (f *fakeGcalRepo) UpdateDefaultCalendarID(ctx context.Context, id uuid.UUID, calendarID string) error {
	f.updateDefaultCalled = true
	f.updateDefaultID = id
	f.updateDefaultArg = calendarID
	if f.updateDefaultErr != nil {
		return f.updateDefaultErr
	}
	if f.got != nil {
		f.got.DefaultCalendarID = calendarID
	}
	return nil
}
func (f *fakeGcalRepo) DeleteAll(ctx context.Context) error {
	f.deleteAllCalled = true
	if f.deleteAllErr != nil {
		return f.deleteAllErr
	}
	f.got = nil
	return nil
}
func (f *fakeGcalRepo) SaveOAuthState(ctx context.Context, state string) error {
	return nil
}
func (f *fakeGcalRepo) ValidateOAuthState(ctx context.Context, state string) (bool, error) {
	return true, nil
}
func (f *fakeGcalRepo) CleanExpiredOAuthStates(ctx context.Context) error {
	return nil
}

func newTestGcalSvc(t *testing.T, repo *fakeGcalRepo) *GcalService {
	t.Helper()
	aes, err := crypto.NewAESCryptoWithKey(make([]byte, 32))
	if err != nil {
		t.Fatalf("crypto: %v", err)
	}
	return NewGcalService(repo, nil, aes, &GcalConfig{
		ClientID:     "cid",
		ClientSecret: "csec",
		RedirectURL:  "http://localhost/cb",
	})
}

func TestGcalService_GetStatus_NotConnected(t *testing.T) {
	repo := &fakeGcalRepo{got: nil}
	svc := newTestGcalSvc(t, repo)

	resp, err := svc.GetStatus(context.Background())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if resp.Connected {
		t.Errorf("connected = true, want false")
	}
	if resp.Email != "" || resp.DefaultCalendarID != "" {
		t.Errorf("expected empty fields when not connected, got %+v", resp)
	}
}

func TestGcalService_GetStatus_Connected(t *testing.T) {
	expires := time.Date(2026, 4, 24, 11, 0, 0, 0, time.UTC)
	created := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	repo := &fakeGcalRepo{
		got: &model.GcalIntegration{
			ID:                   uuid.New(),
			Email:                "user@example.com",
			TokenExpiry:          expires,
			AccessTokenExpiresAt: &expires,
			DefaultCalendarID:    "primary",
			CreatedAt:            created,
		},
	}
	svc := newTestGcalSvc(t, repo)

	resp, err := svc.GetStatus(context.Background())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !resp.Connected {
		t.Fatal("connected = false, want true")
	}
	if resp.Email != "user@example.com" {
		t.Errorf("email = %s", resp.Email)
	}
	if resp.AccessTokenExpiresAt == nil || *resp.AccessTokenExpiresAt != "2026-04-24T11:00:00Z" {
		t.Errorf("expires = %v", resp.AccessTokenExpiresAt)
	}
	if resp.ConnectedAt == nil || *resp.ConnectedAt != "2026-04-01T00:00:00Z" {
		t.Errorf("connected_at = %v", resp.ConnectedAt)
	}
	if resp.DefaultCalendarID != "primary" {
		t.Errorf("default = %s", resp.DefaultCalendarID)
	}
}

func TestGcalService_GetStatus_FallbackToTokenExpiry(t *testing.T) {
	expires := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	repo := &fakeGcalRepo{
		got: &model.GcalIntegration{
			ID:                   uuid.New(),
			Email:                "u@example.com",
			TokenExpiry:          expires,
			AccessTokenExpiresAt: nil, // 舊資料尚未 backfill
			DefaultCalendarID:    "",
			CreatedAt:            time.Now(),
		},
	}
	svc := newTestGcalSvc(t, repo)
	resp, err := svc.GetStatus(context.Background())
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if resp.AccessTokenExpiresAt == nil || *resp.AccessTokenExpiresAt != "2026-05-01T00:00:00Z" {
		t.Errorf("fallback expires = %v", resp.AccessTokenExpiresAt)
	}
	if resp.DefaultCalendarID != "primary" {
		t.Errorf("default fallback = %s", resp.DefaultCalendarID)
	}
}

func TestGcalService_UpdateDefaultCalendar_NotConnected(t *testing.T) {
	repo := &fakeGcalRepo{got: nil}
	svc := newTestGcalSvc(t, repo)

	_, err := svc.UpdateDefaultCalendar(context.Background(), "work@group.calendar.google.com")
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("err type = %T", err)
	}
	if appErr.Code != model.ErrCodeGcalNotConnected {
		t.Errorf("code = %s", appErr.Code)
	}
	if appErr.Status != 424 {
		t.Errorf("status = %d", appErr.Status)
	}
}

func TestGcalService_UpdateDefaultCalendar_EmptyInput(t *testing.T) {
	repo := &fakeGcalRepo{got: &model.GcalIntegration{ID: uuid.New()}}
	svc := newTestGcalSvc(t, repo)

	_, err := svc.UpdateDefaultCalendar(context.Background(), "")
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("err type = %T", err)
	}
	if appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("code = %s", appErr.Code)
	}
}

func TestGcalService_UpdateDefaultCalendar_OK(t *testing.T) {
	id := uuid.New()
	repo := &fakeGcalRepo{
		got: &model.GcalIntegration{
			ID:                id,
			Email:             "u@example.com",
			DefaultCalendarID: "primary",
			CreatedAt:         time.Now(),
			TokenExpiry:       time.Now().Add(time.Hour),
		},
	}
	svc := newTestGcalSvc(t, repo)

	resp, err := svc.UpdateDefaultCalendar(context.Background(), "work@group.calendar.google.com")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if !repo.updateDefaultCalled {
		t.Error("UpdateDefaultCalendarID not called")
	}
	if repo.updateDefaultID != id {
		t.Errorf("id passed = %v want %v", repo.updateDefaultID, id)
	}
	if repo.updateDefaultArg != "work@group.calendar.google.com" {
		t.Errorf("arg = %s", repo.updateDefaultArg)
	}
	if !resp.Connected || resp.DefaultCalendarID != "work@group.calendar.google.com" {
		t.Errorf("status payload = %+v", resp)
	}
}

func TestGcalService_Disconnect_OK(t *testing.T) {
	repo := &fakeGcalRepo{got: &model.GcalIntegration{ID: uuid.New()}}
	svc := newTestGcalSvc(t, repo)

	if err := svc.Disconnect(context.Background()); err != nil {
		t.Fatalf("err: %v", err)
	}
	if !repo.deleteAllCalled {
		t.Error("DeleteAll not called")
	}

	// 後續 GetStatus 應回 connected=false
	resp, err := svc.GetStatus(context.Background())
	if err != nil {
		t.Fatalf("status err: %v", err)
	}
	if resp.Connected {
		t.Error("after disconnect, connected should be false")
	}
}

func TestGcalService_Disconnect_Idempotent(t *testing.T) {
	// 未連線時 Disconnect 應 idempotent，DeleteAll 仍可呼叫但不報錯
	repo := &fakeGcalRepo{got: nil}
	svc := newTestGcalSvc(t, repo)

	if err := svc.Disconnect(context.Background()); err != nil {
		t.Fatalf("err: %v", err)
	}
	if !repo.deleteAllCalled {
		t.Error("DeleteAll should be called even when not connected")
	}
}

func TestGcalService_Disconnect_DBError(t *testing.T) {
	repo := &fakeGcalRepo{deleteAllErr: errors.New("db down")}
	svc := newTestGcalSvc(t, repo)

	if err := svc.Disconnect(context.Background()); err == nil {
		t.Fatal("expected error when DB fails")
	}
}
