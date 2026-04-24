package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
	gcal "google.golang.org/api/calendar/v3"
)

// stubGcalFetcher 提供可控的 GcalEventFetcher 行為
type stubGcalFetcher struct {
	event *gcal.Event
	err   error
}

func (s *stubGcalFetcher) GetEvent(ctx context.Context, calendarID, eventID string) (*gcal.Event, error) {
	return s.event, s.err
}

// stubEntryRepo 最小化實作；只需要 Create，其他方法回 nil / panic
type stubEntryRepo struct {
	createErr   error
	captured    *model.Entry
	createCalls int
}

func (s *stubEntryRepo) Create(ctx context.Context, entry *model.Entry) error {
	s.createCalls++
	s.captured = entry
	return s.createErr
}

func (s *stubEntryRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubEntryRepo) List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error) {
	return nil, nil
}
func (s *stubEntryRepo) Update(ctx context.Context, entry *model.Entry) error { return nil }
func (s *stubEntryRepo) Delete(ctx context.Context, id uuid.UUID) error       { return nil }
func (s *stubEntryRepo) ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubEntryRepo) FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error) {
	return nil, nil, nil
}
func (s *stubEntryRepo) GetFlags(ctx context.Context, entryID uuid.UUID) ([]model.EntryFlag, error) {
	return nil, nil
}
func (s *stubEntryRepo) ExistsBySourceRef(ctx context.Context, sourceType, sourceRef string) (bool, error) {
	return false, nil
}
func (s *stubEntryRepo) CategoryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	return false, nil
}
func (s *stubEntryRepo) SupersedeEntry(ctx context.Context, oldID, newID uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubEntryRepo) ClearSupersede(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (s *stubEntryRepo) GetSupersedeChain(ctx context.Context, id uuid.UUID) ([]repository.HistoryItem, error) {
	return nil, nil
}
func (s *stubEntryRepo) CheckCircularSupersede(ctx context.Context, oldID, newID uuid.UUID) (bool, error) {
	return false, nil
}

// -----------------------------------------------------------------------------
// 201 Happy：成功轉換
// -----------------------------------------------------------------------------
func TestConvertEventToEntry_Happy(t *testing.T) {
	event := &gcal.Event{Id: "evt-123", Summary: "Team Sync", Description: "weekly"}
	fetcher := &stubGcalFetcher{event: event}
	repo := &stubEntryRepo{}
	svc := service.NewCalendarConvertService(fetcher, repo)

	entry, err := svc.ConvertEventToEntry(context.Background(), "evt-123", "primary", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if entry == nil {
		t.Fatal("expected entry, got nil")
	}
	if repo.createCalls != 1 {
		t.Errorf("Create 應被呼叫 1 次，實際 %d", repo.createCalls)
	}
	if entry.SourceType == nil || *entry.SourceType != "gcal" {
		t.Errorf("source_type 應為 gcal")
	}
	if entry.SourceRef == nil || *entry.SourceRef != "evt-123" {
		t.Errorf("source_ref 應為 evt-123，實際 %v", entry.SourceRef)
	}
	// 確認 tag 不再 hardcode "meeting"
	for _, tag := range entry.Tags {
		if tag == "meeting" {
			t.Errorf("tags 不應 hardcode meeting")
		}
	}
	foundGcal := false
	for _, tag := range entry.Tags {
		if tag == "gcal" {
			foundGcal = true
		}
	}
	if !foundGcal {
		t.Error("tags 應含 gcal")
	}
}

// -----------------------------------------------------------------------------
// 409 ALREADY_LINKED：Create 回 409，svc 直接傳回
// -----------------------------------------------------------------------------
func TestConvertEventToEntry_AlreadyLinked(t *testing.T) {
	event := &gcal.Event{Id: "evt-dup", Summary: "已轉過的會議"}
	fetcher := &stubGcalFetcher{event: event}
	repo := &stubEntryRepo{
		createErr: model.NewAppError(409, model.ErrCodeAlreadyLinked, "此 Google Calendar event 已轉成 entry"),
	}
	svc := service.NewCalendarConvertService(fetcher, repo)

	_, err := svc.ConvertEventToEntry(context.Background(), "evt-dup", "primary", nil, nil)
	if err == nil {
		t.Fatal("預期有 409，實際 nil")
	}
	var appErr *model.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 409 || appErr.Code != model.ErrCodeAlreadyLinked {
		t.Errorf("預期 409 ALREADY_LINKED，實際 %d %s", appErr.Status, appErr.Code)
	}
}

// -----------------------------------------------------------------------------
// 424 GCAL_NOT_CONNECTED：fetcher 回 424
// -----------------------------------------------------------------------------
func TestConvertEventToEntry_GcalNotConnected(t *testing.T) {
	fetcher := &stubGcalFetcher{
		err: model.NewAppError(424, model.ErrCodeGcalNotConnected, "尚未連接 Google Calendar"),
	}
	repo := &stubEntryRepo{}
	svc := service.NewCalendarConvertService(fetcher, repo)

	_, err := svc.ConvertEventToEntry(context.Background(), "evt-x", "primary", nil, nil)
	if err == nil {
		t.Fatal("預期 424")
	}
	var appErr *model.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 424 || appErr.Code != model.ErrCodeGcalNotConnected {
		t.Errorf("預期 424 GCAL_NOT_CONNECTED，實際 %d %s", appErr.Status, appErr.Code)
	}
	if repo.createCalls != 0 {
		t.Error("GcalNotConnected 時不應呼叫 Create")
	}
}

// -----------------------------------------------------------------------------
// 502 GCAL_UPSTREAM_ERROR：fetcher 回 502
// -----------------------------------------------------------------------------
func TestConvertEventToEntry_GcalUpstream(t *testing.T) {
	fetcher := &stubGcalFetcher{
		err: model.NewAppError(502, model.ErrCodeGcalUpstream, "Google Calendar 上游錯誤"),
	}
	repo := &stubEntryRepo{}
	svc := service.NewCalendarConvertService(fetcher, repo)

	_, err := svc.ConvertEventToEntry(context.Background(), "evt-x", "primary", nil, nil)
	if err == nil {
		t.Fatal("預期 502")
	}
	var appErr *model.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 502 {
		t.Errorf("預期 502，實際 %d", appErr.Status)
	}
}

// -----------------------------------------------------------------------------
// 404 EVENT_NOT_FOUND：fetcher 回 nil event
// -----------------------------------------------------------------------------
func TestConvertEventToEntry_EventNotFound(t *testing.T) {
	fetcher := &stubGcalFetcher{event: nil}
	repo := &stubEntryRepo{}
	svc := service.NewCalendarConvertService(fetcher, repo)

	_, err := svc.ConvertEventToEntry(context.Background(), "evt-missing", "primary", nil, nil)
	if err == nil {
		t.Fatal("預期 404")
	}
	var appErr *model.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 404 || appErr.Code != model.ErrCodeEventNotFound {
		t.Errorf("預期 404 EVENT_NOT_FOUND，實際 %d %s", appErr.Status, appErr.Code)
	}
	if repo.createCalls != 0 {
		t.Error("EventNotFound 時不應呼叫 Create")
	}
}

// -----------------------------------------------------------------------------
// 400 INVALID_INPUT：空 gcal_id
// -----------------------------------------------------------------------------
func TestConvertEventToEntry_EmptyGcalID(t *testing.T) {
	svc := service.NewCalendarConvertService(&stubGcalFetcher{}, &stubEntryRepo{})
	_, err := svc.ConvertEventToEntry(context.Background(), "", "primary", nil, nil)
	if err == nil {
		t.Fatal("預期 400")
	}
	var appErr *model.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 400 {
		t.Errorf("預期 400，實際 %d", appErr.Status)
	}
}

// 覆蓋 title / content override 路徑
func TestConvertEventToEntry_WithOverrides(t *testing.T) {
	event := &gcal.Event{Id: "evt-42", Summary: "Original"}
	fetcher := &stubGcalFetcher{event: event}
	repo := &stubEntryRepo{}
	svc := service.NewCalendarConvertService(fetcher, repo)

	titleOverride := "Custom Title"
	contentOverride := "Custom body"
	_, err := svc.ConvertEventToEntry(context.Background(), "evt-42", "primary", &titleOverride, &contentOverride)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.captured == nil || repo.captured.Title == nil || *repo.captured.Title != titleOverride {
		t.Errorf("title override 失效")
	}
	if repo.captured.Content == nil || *repo.captured.Content != contentOverride {
		t.Errorf("content override 失效")
	}
}
