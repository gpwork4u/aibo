package repository

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// withTestDB 取得測試 DB pool，若未設置 TEST_DATABASE_URL 則跳過整合測試。
//
// 預期連到已套用 migration 001 ~ 012 的 Postgres，測試會清空 entries 表作隔離。
func withTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL 未設置，跳過行事曆 repo 整合測試")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("連接測試 DB 失敗: %v", err)
	}
	if _, err := pool.Exec(context.Background(), "DELETE FROM entries"); err != nil {
		pool.Close()
		t.Fatalf("清空 entries 失敗: %v", err)
	}
	return pool
}

// insertCalEntry 插入測試 entry，指定 created_at 與 is_archived。
func insertCalEntry(t *testing.T, pool *pgxpool.Pool, title string, createdAt time.Time, archived bool) uuid.UUID {
	t.Helper()
	id := uuid.New()
	_, err := pool.Exec(context.Background(),
		`INSERT INTO entries (id, title, content, tags, domains, is_archived, created_at, updated_at, quality_flags)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $7, '[]'::jsonb)`,
		id, title, "content", []string{}, []string{}, archived, createdAt,
	)
	if err != nil {
		t.Fatalf("插入 entry 失敗: %v", err)
	}
	return id
}

// TestListByDateRange_UTC 驗證 UTC 時區下依日期過濾。
func TestListByDateRange_UTC(t *testing.T) {
	pool := withTestDB(t)
	defer pool.Close()
	repo := NewEntryRepository(pool)

	insertCalEntry(t, pool, "day-23", time.Date(2026, 4, 23, 12, 0, 0, 0, time.UTC), false)
	target := insertCalEntry(t, pool, "day-24", time.Date(2026, 4, 24, 12, 0, 0, 0, time.UTC), false)
	insertCalEntry(t, pool, "day-25", time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC), false)

	items, err := repo.ListByDateRange(context.Background(), "2026-04-24", "2026-04-24", "UTC")
	if err != nil {
		t.Fatalf("ListByDateRange: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(items))
	}
	if items[0].ID != target {
		t.Errorf("expected id=%s, got %s", target, items[0].ID)
	}
	if items[0].Date != "2026-04-24" {
		t.Errorf("expected Date=2026-04-24, got %q", items[0].Date)
	}
}

// TestListByDateRange_AsiaTaipei_CrossDay 驗證 Asia/Taipei 時區跨日分桶。
// UTC 2026-04-24T23:30 → Asia/Taipei 2026-04-25T07:30，應歸屬於 2026-04-25。
func TestListByDateRange_AsiaTaipei_CrossDay(t *testing.T) {
	pool := withTestDB(t)
	defer pool.Close()
	repo := NewEntryRepository(pool)

	target := insertCalEntry(t, pool, "cross-day",
		time.Date(2026, 4, 24, 23, 30, 0, 0, time.UTC), false)

	// Asia/Taipei 2026-04-25 → 應命中
	items, err := repo.ListByDateRange(context.Background(), "2026-04-25", "2026-04-25", "Asia/Taipei")
	if err != nil {
		t.Fatalf("ListByDateRange Asia/Taipei: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 entry in Asia/Taipei 2026-04-25, got %d", len(items))
	}
	if items[0].ID != target {
		t.Errorf("expected id=%s, got %s", target, items[0].ID)
	}
	if items[0].Date != "2026-04-25" {
		t.Errorf("expected Date=2026-04-25 (Taipei bucket), got %q", items[0].Date)
	}

	// 同一筆以 UTC 撈 2026-04-25 → 不應命中（UTC 下屬於 04-24）
	items, err = repo.ListByDateRange(context.Background(), "2026-04-25", "2026-04-25", "UTC")
	if err != nil {
		t.Fatalf("ListByDateRange UTC: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 entries in UTC 2026-04-25, got %d", len(items))
	}

	// 以 UTC 撈 2026-04-24 → 應命中
	items, err = repo.ListByDateRange(context.Background(), "2026-04-24", "2026-04-24", "UTC")
	if err != nil {
		t.Fatalf("ListByDateRange UTC 04-24: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1 entry in UTC 2026-04-24, got %d", len(items))
	}
}

// TestListByDateRange_ExcludesArchived 驗證 is_archived=true 的 entry 被排除。
func TestListByDateRange_ExcludesArchived(t *testing.T) {
	pool := withTestDB(t)
	defer pool.Close()
	repo := NewEntryRepository(pool)

	insertCalEntry(t, pool, "active", time.Date(2026, 4, 24, 10, 0, 0, 0, time.UTC), false)
	insertCalEntry(t, pool, "archived", time.Date(2026, 4, 24, 11, 0, 0, 0, time.UTC), true)

	items, err := repo.ListByDateRange(context.Background(), "2026-04-24", "2026-04-24", "UTC")
	if err != nil {
		t.Fatalf("ListByDateRange: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 active entry, got %d", len(items))
	}
	if items[0].Title == nil || *items[0].Title != "active" {
		t.Errorf("expected title 'active', got %v", items[0].Title)
	}
}

// TestListByDateRange_MultiDayRange 驗證多日區間與 ASC 排序、分桶日期正確。
func TestListByDateRange_MultiDayRange(t *testing.T) {
	pool := withTestDB(t)
	defer pool.Close()
	repo := NewEntryRepository(pool)

	insertCalEntry(t, pool, "day1", time.Date(2026, 4, 23, 8, 0, 0, 0, time.UTC), false)
	insertCalEntry(t, pool, "day2", time.Date(2026, 4, 24, 8, 0, 0, 0, time.UTC), false)
	insertCalEntry(t, pool, "day3", time.Date(2026, 4, 25, 8, 0, 0, 0, time.UTC), false)

	items, err := repo.ListByDateRange(context.Background(), "2026-04-23", "2026-04-25", "UTC")
	if err != nil {
		t.Fatalf("ListByDateRange: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(items))
	}
	if !(items[0].CreatedAt.Before(items[1].CreatedAt) && items[1].CreatedAt.Before(items[2].CreatedAt)) {
		t.Errorf("expected ASC order by created_at")
	}
	wantDates := []string{"2026-04-23", "2026-04-24", "2026-04-25"}
	for i, w := range wantDates {
		if items[i].Date != w {
			t.Errorf("items[%d].Date: expected %q, got %q", i, w, items[i].Date)
		}
	}
}

// TestListByDateRange_EmptyTzDefaultsUTC 驗證 tz 為空字串時預設當作 UTC。
func TestListByDateRange_EmptyTzDefaultsUTC(t *testing.T) {
	pool := withTestDB(t)
	defer pool.Close()
	repo := NewEntryRepository(pool)

	insertCalEntry(t, pool, "noon", time.Date(2026, 4, 24, 12, 0, 0, 0, time.UTC), false)

	items, err := repo.ListByDateRange(context.Background(), "2026-04-24", "2026-04-24", "")
	if err != nil {
		t.Fatalf("ListByDateRange: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 entry with default tz=UTC, got %d", len(items))
	}
}
