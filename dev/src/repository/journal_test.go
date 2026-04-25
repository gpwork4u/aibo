package repository

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

// withJournalTestDB 取得專供 journal 測試使用的 DB pool。
//
// 與 entry calendar 測試共用同一條 TEST_DATABASE_URL；本 helper 只清空
// 與本檔測試相關的兩張表（journal_source_refs → journal_entries），
// 並沿用既有的「dbname 必須含 'test' 字樣」防呆，避免誤連 dev/prod。
func withJournalTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL 未設置，跳過 journal repo 整合測試")
	}
	if os.Getenv("ALLOW_NON_TEST_DB") != "1" && !strings.Contains(strings.ToLower(dsn), "test") {
		t.Fatalf("TEST_DATABASE_URL 未包含 'test' 字樣，為安全起見拒絕對此 DB 執行破壞性測試")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("連接測試 DB 失敗: %v", err)
	}

	// 子表先清，主表後清（FK CASCADE 也行，但顯式清更安全）
	for _, table := range []string{"journal_source_refs", "journal_entries"} {
		if _, err := pool.Exec(context.Background(), "DELETE FROM "+table); err != nil {
			pool.Close()
			t.Fatalf("清空 %s 失敗: %v", table, err)
		}
	}
	return pool
}

// makeJournal 建立一個測試用 Journal（呼叫端可只覆蓋需要的欄位）
func makeJournal(date time.Time, content string) *model.Journal {
	mood := model.MoodOk
	gen := model.GeneratedByUser
	return &model.Journal{
		Date:        date,
		Content:     content,
		Mood:        &mood,
		Highlights:  []string{"h1", "h2"},
		IsDraft:     false,
		GeneratedBy: &gen,
	}
}

func date(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func ptrStr(s string) *string { return &s }
func ptrBool(b bool) *bool    { return &b }

func TestJournal_CreateAndGetByDate(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	d := date(2026, 4, 24)
	j := makeJournal(d, "Today was great.")
	refs := []model.JournalSourceRef{
		{SourceType: model.JournalSourceTypeEntry, SourceID: uuid.New().String()},
		{SourceType: model.JournalSourceTypeGcalEvent, SourceID: "gcal-abc123"},
	}

	if err := repo.Create(context.Background(), j, refs); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if j.ID == uuid.Nil {
		t.Fatalf("expected ID populated after Create")
	}

	got, gotRefs, err := repo.GetByDate(context.Background(), d)
	if err != nil {
		t.Fatalf("GetByDate: %v", err)
	}
	if got == nil {
		t.Fatalf("expected journal, got nil")
	}
	if got.Content != "Today was great." {
		t.Errorf("content mismatch: %q", got.Content)
	}
	if got.Mood == nil || *got.Mood != model.MoodOk {
		t.Errorf("mood mismatch: %v", got.Mood)
	}
	if len(got.Highlights) != 2 {
		t.Errorf("highlights len: %d", len(got.Highlights))
	}
	if len(gotRefs) != 2 {
		t.Errorf("expected 2 source_refs, got %d", len(gotRefs))
	}
}

func TestJournal_Create_DuplicateDate(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	d := date(2026, 4, 24)
	if err := repo.Create(context.Background(), makeJournal(d, "first"), nil); err != nil {
		t.Fatalf("first Create: %v", err)
	}

	err := repo.Create(context.Background(), makeJournal(d, "second"), nil)
	if err == nil {
		t.Fatal("expected JOURNAL_EXISTS, got nil")
	}
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected *AppError, got %T: %v", err, err)
	}
	if appErr.Status != 409 || appErr.Code != model.ErrCodeJournalExists {
		t.Errorf("expected 409 JOURNAL_EXISTS, got %d %s", appErr.Status, appErr.Code)
	}
}

func TestJournal_GetByDate_NotFound(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	j, refs, err := repo.GetByDate(context.Background(), date(2026, 4, 24))
	if err != nil {
		t.Fatalf("GetByDate: %v", err)
	}
	if j != nil || refs != nil {
		t.Errorf("expected nil result for missing date, got j=%v refs=%v", j, refs)
	}
}

func TestJournal_Update_PartialAndSourceRefsReplace(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	d := date(2026, 4, 24)
	j := makeJournal(d, "draft content")
	j.IsDraft = true
	gen := model.GeneratedByLlm
	j.GeneratedBy = &gen
	if err := repo.Create(context.Background(), j, []model.JournalSourceRef{
		{SourceType: "entry", SourceID: "old-1"},
	}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	// 部分更新：content + is_draft + source_refs 整批覆寫
	newRefs := []dto.SourceRefDTO{
		{SourceType: "entry", SourceID: "new-1"},
		{SourceType: "entry", SourceID: "new-2"},
	}
	patch := &dto.UpdateJournalRequest{
		Content:    ptrStr("edited"),
		IsDraft:    ptrBool(false),
		SourceRefs: &newRefs,
	}
	updated, err := repo.Update(context.Background(), d, patch)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Content != "edited" {
		t.Errorf("content not updated: %q", updated.Content)
	}
	if updated.IsDraft {
		t.Errorf("is_draft should be false")
	}
	// generated_by 應保持 'llm'（spec §Update 要求 confirm draft 不變 generated_by）
	if updated.GeneratedBy == nil || *updated.GeneratedBy != model.GeneratedByLlm {
		t.Errorf("generated_by should remain 'llm', got %v", updated.GeneratedBy)
	}

	// 驗證 source_refs 已被覆寫
	_, gotRefs, err := repo.GetByDate(context.Background(), d)
	if err != nil {
		t.Fatalf("GetByDate: %v", err)
	}
	if len(gotRefs) != 2 {
		t.Fatalf("expected 2 refs after replace, got %d", len(gotRefs))
	}
	for _, r := range gotRefs {
		if r.SourceID == "old-1" {
			t.Errorf("old ref should have been removed")
		}
	}
}

func TestJournal_Update_NotFound(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	_, err := repo.Update(context.Background(), date(2026, 4, 24), &dto.UpdateJournalRequest{
		Content: ptrStr("anything"),
	})
	if err == nil {
		t.Fatal("expected error for missing journal")
	}
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 404 || appErr.Code != model.ErrCodeJournalNotFound {
		t.Errorf("expected 404 JOURNAL_NOT_FOUND, got %v", err)
	}
}

func TestJournal_Delete(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	d := date(2026, 4, 24)
	if err := repo.Create(context.Background(), makeJournal(d, "x"), []model.JournalSourceRef{
		{SourceType: "entry", SourceID: "to-cascade"},
	}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := repo.Delete(context.Background(), d); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	// 確認 cascade
	got, refs, _ := repo.GetByDate(context.Background(), d)
	if got != nil || len(refs) != 0 {
		t.Errorf("expected journal & refs deleted")
	}

	// 重複刪 → 404
	err := repo.Delete(context.Background(), d)
	if err == nil {
		t.Fatal("expected 404 on second delete")
	}
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 404 {
		t.Errorf("expected 404, got %v", err)
	}
}

func TestJournal_List_Filters(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	// 建立 5 筆，混合 mood + is_draft
	specs := []struct {
		date    time.Time
		mood    string
		isDraft bool
	}{
		{date(2026, 4, 20), model.MoodGreat, false},
		{date(2026, 4, 21), model.MoodOk, true},
		{date(2026, 4, 22), model.MoodOk, false},
		{date(2026, 4, 23), model.MoodDown, false},
		{date(2026, 4, 24), model.MoodGreat, true},
	}
	for _, s := range specs {
		mood := s.mood
		gen := model.GeneratedByUser
		j := &model.Journal{
			Date: s.date, Content: "x", Mood: &mood, IsDraft: s.isDraft,
			GeneratedBy: &gen,
		}
		if err := repo.Create(context.Background(), j, nil); err != nil {
			t.Fatalf("Create %v: %v", s.date, err)
		}
	}

	// 過濾 mood=ok
	mood := model.MoodOk
	items, total, err := repo.List(context.Background(), JournalListOptions{
		Page: 1, PerPage: 10, Mood: &mood,
	})
	if err != nil {
		t.Fatalf("List mood=ok: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Errorf("mood=ok: expected 2, got total=%d len=%d", total, len(items))
	}

	// is_draft=true
	isDraft := true
	items, total, err = repo.List(context.Background(), JournalListOptions{
		Page: 1, PerPage: 10, IsDraft: &isDraft,
	})
	if err != nil {
		t.Fatalf("List is_draft=true: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Errorf("is_draft=true: expected 2, got total=%d len=%d", total, len(items))
	}

	// since/until
	since := date(2026, 4, 22)
	until := date(2026, 4, 23)
	items, total, err = repo.List(context.Background(), JournalListOptions{
		Page: 1, PerPage: 10, Since: &since, Until: &until,
	})
	if err != nil {
		t.Fatalf("List since/until: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Errorf("since/until: expected 2, got total=%d len=%d", total, len(items))
	}
	// 排序：date DESC
	if !items[0].Date.After(items[1].Date) {
		t.Errorf("expected DESC by date")
	}

	// 分頁
	items, total, err = repo.List(context.Background(), JournalListOptions{
		Page: 2, PerPage: 2,
	})
	if err != nil {
		t.Fatalf("List page=2: %v", err)
	}
	if total != 5 {
		t.Errorf("expected total=5, got %d", total)
	}
	if len(items) != 2 {
		t.Errorf("expected 2 items on page 2, got %d", len(items))
	}
}

func TestJournal_ReplaceSourceRefs(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	d := date(2026, 4, 24)
	j := makeJournal(d, "x")
	if err := repo.Create(context.Background(), j, []model.JournalSourceRef{
		{SourceType: "entry", SourceID: "a"},
		{SourceType: "entry", SourceID: "b"},
	}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := repo.ReplaceSourceRefs(context.Background(), j.ID, []model.JournalSourceRef{
		{SourceType: "gcal_event", SourceID: "evt-1"},
	}); err != nil {
		t.Fatalf("ReplaceSourceRefs: %v", err)
	}

	refs, err := repo.GetSourceRefs(context.Background(), j.ID)
	if err != nil {
		t.Fatalf("GetSourceRefs: %v", err)
	}
	if len(refs) != 1 || refs[0].SourceType != "gcal_event" || refs[0].SourceID != "evt-1" {
		t.Errorf("unexpected refs after replace: %+v", refs)
	}
}

func TestJournal_Create_ContentTooLong(t *testing.T) {
	pool := withJournalTestDB(t)
	defer pool.Close()
	repo := NewJournalRepository(pool)

	long := strings.Repeat("a", 20001)
	err := repo.Create(context.Background(), makeJournal(date(2026, 4, 24), long), nil)
	if err == nil {
		t.Fatal("expected content length check violation")
	}
	appErr, _ := err.(*model.AppError)
	if appErr == nil || appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected 400 INVALID_INPUT, got %v", err)
	}
}
