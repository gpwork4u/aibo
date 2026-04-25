package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
)

// withGcalTestDB 取得測試 DB pool 並清空 gcal_integrations 表。
// 使用與 entry_calendar_test.go 同樣的 TEST_DATABASE_URL 安全防護機制。
func withGcalTestDB(t *testing.T) (*GcalIntegrationRepository, func()) {
	t.Helper()
	pool := withTestDB(t)
	if _, err := pool.Exec(context.Background(), "DELETE FROM gcal_integrations"); err != nil {
		pool.Close()
		t.Fatalf("清空 gcal_integrations 失敗: %v", err)
	}
	repo := NewGcalIntegrationRepository(pool)
	return repo, func() { pool.Close() }
}

func newTestIntegration() *model.GcalIntegration {
	now := time.Now().UTC().Truncate(time.Second)
	expiry := now.Add(1 * time.Hour)
	return &model.GcalIntegration{
		ID:           uuid.New(),
		Email:        "user@example.com",
		ClientID:     "test-client-id",
		ClientSecret: "enc-secret",
		AccessToken:  "enc-access",
		RefreshToken: "enc-refresh",
		TokenExpiry:  expiry,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// TestUpsert_DefaultsCalendarIDToPrimary 驗證 Upsert 時若未指定 default_calendar_id，使用預設 "primary"。
func TestUpsert_DefaultsCalendarIDToPrimary(t *testing.T) {
	repo, cleanup := withGcalTestDB(t)
	defer cleanup()

	ctx := context.Background()
	integ := newTestIntegration()
	// 故意不設 DefaultCalendarID
	if err := repo.Upsert(ctx, integ); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	got, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got == nil {
		t.Fatal("expected integration, got nil")
	}
	if got.DefaultCalendarID != "primary" {
		t.Errorf("DefaultCalendarID: expected 'primary', got %q", got.DefaultCalendarID)
	}
}

// TestUpsert_DoubleWriteAccessTokenExpiresAt 驗證 Upsert 時 access_token_expires_at 雙寫。
func TestUpsert_DoubleWriteAccessTokenExpiresAt(t *testing.T) {
	repo, cleanup := withGcalTestDB(t)
	defer cleanup()

	ctx := context.Background()
	integ := newTestIntegration()
	if err := repo.Upsert(ctx, integ); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	got, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.AccessTokenExpiresAt == nil {
		t.Fatal("AccessTokenExpiresAt should be backfilled from TokenExpiry")
	}
	if !got.AccessTokenExpiresAt.Equal(integ.TokenExpiry) {
		t.Errorf("AccessTokenExpiresAt: expected %v, got %v", integ.TokenExpiry, *got.AccessTokenExpiresAt)
	}
}

// TestUpsert_InheritsCustomCalendarID 驗證重新 OAuth 後，default_calendar_id 不會被重置。
func TestUpsert_InheritsCustomCalendarID(t *testing.T) {
	repo, cleanup := withGcalTestDB(t)
	defer cleanup()

	ctx := context.Background()
	first := newTestIntegration()
	first.DefaultCalendarID = "work@group.calendar.google.com"
	if err := repo.Upsert(ctx, first); err != nil {
		t.Fatalf("first Upsert: %v", err)
	}

	// 模擬重新 OAuth：新 ID、未指定 default
	second := newTestIntegration()
	if err := repo.Upsert(ctx, second); err != nil {
		t.Fatalf("second Upsert: %v", err)
	}

	got, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.DefaultCalendarID != "work@group.calendar.google.com" {
		t.Errorf("DefaultCalendarID 應繼承舊值, got %q", got.DefaultCalendarID)
	}
}

// TestUpdateDefaultCalendarID 驗證更新 default_calendar_id。
func TestUpdateDefaultCalendarID(t *testing.T) {
	repo, cleanup := withGcalTestDB(t)
	defer cleanup()

	ctx := context.Background()
	integ := newTestIntegration()
	if err := repo.Upsert(ctx, integ); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	newCal := "team@group.calendar.google.com"
	if err := repo.UpdateDefaultCalendarID(ctx, integ.ID, newCal); err != nil {
		t.Fatalf("UpdateDefaultCalendarID: %v", err)
	}

	got, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.DefaultCalendarID != newCal {
		t.Errorf("DefaultCalendarID: expected %q, got %q", newCal, got.DefaultCalendarID)
	}
}

// TestUpdateDefaultCalendarID_EmptyResetsToPrimary 驗證傳入空字串時重置為 "primary"。
func TestUpdateDefaultCalendarID_EmptyResetsToPrimary(t *testing.T) {
	repo, cleanup := withGcalTestDB(t)
	defer cleanup()

	ctx := context.Background()
	integ := newTestIntegration()
	integ.DefaultCalendarID = "x@group.calendar.google.com"
	if err := repo.Upsert(ctx, integ); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	if err := repo.UpdateDefaultCalendarID(ctx, integ.ID, ""); err != nil {
		t.Fatalf("UpdateDefaultCalendarID empty: %v", err)
	}

	got, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.DefaultCalendarID != "primary" {
		t.Errorf("空字串應重置為 'primary'，got %q", got.DefaultCalendarID)
	}
}

// TestDeleteAll 驗證 DeleteAll 清空所有紀錄。
func TestDeleteAll(t *testing.T) {
	repo, cleanup := withGcalTestDB(t)
	defer cleanup()

	ctx := context.Background()
	integ := newTestIntegration()
	if err := repo.Upsert(ctx, integ); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	if err := repo.DeleteAll(ctx); err != nil {
		t.Fatalf("DeleteAll: %v", err)
	}

	got, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != nil {
		t.Errorf("expected no integration after DeleteAll, got %+v", got)
	}
}

// TestUpdateTokens_DoubleWrite 驗證 UpdateTokens 同時更新 token_expiry 與 access_token_expires_at。
func TestUpdateTokens_DoubleWrite(t *testing.T) {
	repo, cleanup := withGcalTestDB(t)
	defer cleanup()

	ctx := context.Background()
	integ := newTestIntegration()
	if err := repo.Upsert(ctx, integ); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	newExpiry := time.Now().UTC().Add(2 * time.Hour).Truncate(time.Second)
	if err := repo.UpdateTokens(ctx, integ.ID, "new-access", "new-refresh", newExpiry); err != nil {
		t.Fatalf("UpdateTokens: %v", err)
	}

	got, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.AccessToken != "new-access" {
		t.Errorf("AccessToken: expected 'new-access', got %q", got.AccessToken)
	}
	if got.RefreshToken != "new-refresh" {
		t.Errorf("RefreshToken: expected 'new-refresh', got %q", got.RefreshToken)
	}
	if !got.TokenExpiry.Equal(newExpiry) {
		t.Errorf("TokenExpiry: expected %v, got %v", newExpiry, got.TokenExpiry)
	}
	if got.AccessTokenExpiresAt == nil || !got.AccessTokenExpiresAt.Equal(newExpiry) {
		t.Errorf("AccessTokenExpiresAt 應同步更新為 %v，got %v", newExpiry, got.AccessTokenExpiresAt)
	}
}
