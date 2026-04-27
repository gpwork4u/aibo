package service_test

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

// stubJournalDraftEntryRepo 提供可控 ListByDateRange，其餘方法為空實作。
type stubJournalDraftEntryRepo struct {
	entries []dto.CalendarEntrySummary
	err     error
}

func (s *stubJournalDraftEntryRepo) ListByDateRange(_ context.Context, _, _, _ string) ([]dto.CalendarEntrySummary, error) {
	return s.entries, s.err
}
func (s *stubJournalDraftEntryRepo) Create(_ context.Context, _ *model.Entry) error { return nil }
func (s *stubJournalDraftEntryRepo) FindByID(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubJournalDraftEntryRepo) List(_ context.Context, _ model.EntryFilter) (*model.EntryListResult, error) {
	return nil, nil
}
func (s *stubJournalDraftEntryRepo) Update(_ context.Context, _ *model.Entry) error { return nil }
func (s *stubJournalDraftEntryRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *stubJournalDraftEntryRepo) ConfirmEntry(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubJournalDraftEntryRepo) FlagEntry(_ context.Context, _ uuid.UUID, _ string, _ *string) (*model.Entry, *model.EntryFlag, error) {
	return nil, nil, nil
}
func (s *stubJournalDraftEntryRepo) GetFlags(_ context.Context, _ uuid.UUID) ([]model.EntryFlag, error) {
	return nil, nil
}
func (s *stubJournalDraftEntryRepo) ExistsBySourceRef(_ context.Context, _, _ string) (bool, error) {
	return false, nil
}
func (s *stubJournalDraftEntryRepo) CategoryExists(_ context.Context, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (s *stubJournalDraftEntryRepo) SupersedeEntry(_ context.Context, _, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubJournalDraftEntryRepo) ClearSupersede(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubJournalDraftEntryRepo) GetSupersedeChain(_ context.Context, _ uuid.UUID) ([]repository.HistoryItem, error) {
	return nil, nil
}
func (s *stubJournalDraftEntryRepo) CheckCircularSupersede(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (s *stubJournalDraftEntryRepo) GetByGcalRef(_ context.Context, _ string) (uuid.UUID, error) {
	return uuid.Nil, nil
}

var _ service.EntryRepository = (*stubJournalDraftEntryRepo)(nil)

// -----------------------------------------------------------------------------
// 400 INVALID_INPUT：日期格式錯
// -----------------------------------------------------------------------------
func TestJournalDraft_InvalidDate(t *testing.T) {
	svc := service.NewJournalDraftService(nil, &stubJournalDraftEntryRepo{}, nil, nil)
	_, err := svc.Draft(context.Background(), "2026-13-99", "UTC", "primary")
	if err == nil {
		t.Fatal("預期 400 invalid date")
	}
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 400 {
		t.Errorf("預期 400 AppError，實際 %v", err)
	}
}

// -----------------------------------------------------------------------------
// 400 INVALID_INPUT：tz 格式錯
// -----------------------------------------------------------------------------
func TestJournalDraft_InvalidTimezone(t *testing.T) {
	svc := service.NewJournalDraftService(nil, &stubJournalDraftEntryRepo{}, nil, nil)
	_, err := svc.Draft(context.Background(), "2026-04-25", "Mars/Olympus", "primary")
	if err == nil {
		t.Fatal("預期 400 invalid tz")
	}
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 400 {
		t.Errorf("預期 400 AppError，實際 %v", err)
	}
}

// -----------------------------------------------------------------------------
// 404 NOT_FOUND：當日無素材
// -----------------------------------------------------------------------------
func TestJournalDraft_NoData(t *testing.T) {
	repo := &stubJournalDraftEntryRepo{entries: nil}
	svc := service.NewJournalDraftService(nil, repo, nil, nil) // gcalSvc nil → 不嘗試 gcal
	_, err := svc.Draft(context.Background(), "2026-04-25", "UTC", "primary")
	if err == nil {
		t.Fatal("預期 404 no data")
	}
	appErr, ok := err.(*model.AppError)
	if !ok || appErr.Status != 404 {
		t.Errorf("預期 404 AppError，實際 %v", err)
	}
}

// -----------------------------------------------------------------------------
// Repo 錯誤 → 包裝後傳出（非 AppError 路徑）
// -----------------------------------------------------------------------------
func TestJournalDraft_RepoError(t *testing.T) {
	repo := &stubJournalDraftEntryRepo{err: fakeRepoErr("db down")}
	svc := service.NewJournalDraftService(nil, repo, nil, nil)
	_, err := svc.Draft(context.Background(), "2026-04-25", "UTC", "primary")
	if err == nil {
		t.Fatal("預期錯誤")
	}
	if !strings.Contains(err.Error(), "db down") {
		t.Errorf("錯誤訊息應包含 repo 原因，實際 %v", err)
	}
}

type fakeRepoErr string

func (e fakeRepoErr) Error() string { return string(e) }
