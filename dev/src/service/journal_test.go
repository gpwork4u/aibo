package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/jackc/pgx/v5"
)

// ─── Fake JournalRepository ────────────────────────────────────────────

type fakeJournalRepo struct {
	createCalled bool
	createErr    error
	createArgs   *model.Journal
	createRefs   []model.JournalSourceRef

	getJournal *model.Journal
	getRefs    []model.JournalSourceRef
	getErr     error

	updateCalled bool
	updateRet    *model.Journal
	updateErr    error
	updatedPatch *dto.UpdateJournalRequest

	deleteCalled bool
	deleteErr    error

	listItems []*model.Journal
	listTotal int64
	listErr   error
	listOpts  repository.JournalListOptions

	getRefsRet []model.JournalSourceRef
	getRefsErr error
}

func (r *fakeJournalRepo) Create(ctx context.Context, j *model.Journal, refs []model.JournalSourceRef) error {
	r.createCalled = true
	r.createArgs = j
	r.createRefs = refs
	if r.createErr != nil {
		return r.createErr
	}
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	now := time.Now()
	j.CreatedAt = now
	j.UpdatedAt = now
	// 模擬：插入後 GetByDate 拿得到
	r.getJournal = j
	r.getRefs = refs
	return nil
}

func (r *fakeJournalRepo) GetByDate(ctx context.Context, date time.Time) (*model.Journal, []model.JournalSourceRef, error) {
	if r.getErr != nil {
		return nil, nil, r.getErr
	}
	if r.getJournal == nil {
		return nil, nil, nil
	}
	return r.getJournal, r.getRefs, nil
}

func (r *fakeJournalRepo) Update(ctx context.Context, date time.Time, patch *dto.UpdateJournalRequest) (*model.Journal, error) {
	r.updateCalled = true
	r.updatedPatch = patch
	if r.updateErr != nil {
		return nil, r.updateErr
	}
	return r.updateRet, nil
}

func (r *fakeJournalRepo) Delete(ctx context.Context, date time.Time) error {
	r.deleteCalled = true
	return r.deleteErr
}

func (r *fakeJournalRepo) List(ctx context.Context, opts repository.JournalListOptions) ([]*model.Journal, int64, error) {
	r.listOpts = opts
	if r.listErr != nil {
		return nil, 0, r.listErr
	}
	return r.listItems, r.listTotal, nil
}

func (r *fakeJournalRepo) ReplaceSourceRefs(ctx context.Context, journalID uuid.UUID, refs []model.JournalSourceRef) error {
	return nil
}

func (r *fakeJournalRepo) GetSourceRefs(ctx context.Context, journalID uuid.UUID) ([]model.JournalSourceRef, error) {
	if r.getRefsErr != nil {
		return nil, r.getRefsErr
	}
	return r.getRefsRet, nil
}

// ─── Fake EntryRepository（最小實作，僅 FindByID 有用） ──────────────────

type fakeEntryRepoForJournal struct {
	existing map[uuid.UUID]bool
}

func (r *fakeEntryRepoForJournal) Create(ctx context.Context, entry *model.Entry) error {
	return nil
}
func (r *fakeEntryRepoForJournal) FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	if r.existing[id] {
		return &model.Entry{ID: id}, nil
	}
	return nil, nil
}
func (r *fakeEntryRepoForJournal) List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error) {
	return nil, nil
}
func (r *fakeEntryRepoForJournal) Update(ctx context.Context, entry *model.Entry) error { return nil }
func (r *fakeEntryRepoForJournal) Delete(ctx context.Context, id uuid.UUID) error       { return nil }
func (r *fakeEntryRepoForJournal) ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *fakeEntryRepoForJournal) FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error) {
	return nil, nil, nil
}
func (r *fakeEntryRepoForJournal) GetFlags(ctx context.Context, entryID uuid.UUID) ([]model.EntryFlag, error) {
	return nil, nil
}
func (r *fakeEntryRepoForJournal) ExistsBySourceRef(ctx context.Context, sourceType, sourceRef string) (bool, error) {
	return false, nil
}
func (r *fakeEntryRepoForJournal) CategoryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	return false, nil
}
func (r *fakeEntryRepoForJournal) ListByDateRange(ctx context.Context, sinceDate, untilDate string, tz string) ([]dto.CalendarEntrySummary, error) {
	return nil, nil
}
func (r *fakeEntryRepoForJournal) SupersedeEntry(ctx context.Context, oldID, newID uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *fakeEntryRepoForJournal) ClearSupersede(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *fakeEntryRepoForJournal) GetSupersedeChain(ctx context.Context, id uuid.UUID) ([]repository.HistoryItem, error) {
	return nil, nil
}
func (r *fakeEntryRepoForJournal) CheckCircularSupersede(ctx context.Context, oldID, newID uuid.UUID) (bool, error) {
	return false, nil
}

// ─── Tests ─────────────────────────────────────────────────────────────

func newJournalSvc(t *testing.T) (*JournalService, *fakeJournalRepo, *fakeEntryRepoForJournal) {
	t.Helper()
	jr := &fakeJournalRepo{}
	er := &fakeEntryRepoForJournal{existing: map[uuid.UUID]bool{}}
	return NewJournalService(jr, er), jr, er
}

func TestParseJournalDate(t *testing.T) {
	d, err := parseJournalDate("2026-04-24", "")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if d.Year() != 2026 || d.Month() != 4 || d.Day() != 24 {
		t.Errorf("expected 2026-04-24, got %v", d)
	}
	if d.Location() != time.UTC {
		t.Errorf("expected UTC, got %v", d.Location())
	}

	if _, err := parseJournalDate("", ""); err == nil {
		t.Error("empty date should error")
	}
	if _, err := parseJournalDate("2026/04/24", ""); err == nil {
		t.Error("invalid format should error")
	}
	if _, err := parseJournalDate("2026-04-24", "Not/A/Zone"); err == nil {
		t.Error("invalid tz should error")
	}
	// 合法 tz
	if _, err := parseJournalDate("2026-04-24", "Asia/Taipei"); err != nil {
		t.Errorf("Asia/Taipei should be valid: %v", err)
	}
}

func TestJournalSvc_Create_HappyPath(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	mood := model.MoodGreat
	req := &dto.CreateJournalRequest{
		Date:    "2026-04-24",
		Content: "Good day.",
		Mood:    &mood,
	}
	j, refs, err := svc.Create(context.Background(), req, "")
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if !repo.createCalled {
		t.Fatal("repo.Create not called")
	}
	if j.IsDraft {
		t.Error("expected is_draft=false")
	}
	if j.GeneratedBy == nil || *j.GeneratedBy != model.GeneratedByUser {
		t.Errorf("expected generated_by=user, got %v", j.GeneratedBy)
	}
	if len(refs) != 0 {
		t.Errorf("expected 0 refs, got %d", len(refs))
	}
}

func TestJournalSvc_Create_ContentTooLong(t *testing.T) {
	svc, _, _ := newJournalSvc(t)
	long := make([]byte, 20001)
	for i := range long {
		long[i] = 'a'
	}
	req := &dto.CreateJournalRequest{
		Date:    "2026-04-24",
		Content: string(long),
	}
	_, _, err := svc.Create(context.Background(), req, "")
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected 400 INVALID_INPUT, got %+v", appErr)
	}
}

func TestJournalSvc_Create_SourceEntryNotFound(t *testing.T) {
	svc, _, _ := newJournalSvc(t)
	req := &dto.CreateJournalRequest{
		Date:    "2026-04-24",
		Content: "x",
		SourceRefs: []dto.SourceRefDTO{
			{SourceType: model.JournalSourceTypeEntry, SourceID: uuid.New().String()},
		},
	}
	_, _, err := svc.Create(context.Background(), req, "")
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T (%v)", err, err)
	}
	if appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected INVALID_INPUT, got %s", appErr.Code)
	}
	if appErr.Message != "source entry not found" {
		t.Errorf("expected 'source entry not found', got %q", appErr.Message)
	}
}

func TestJournalSvc_Create_SourceEntryFound(t *testing.T) {
	svc, _, er := newJournalSvc(t)
	id := uuid.New()
	er.existing[id] = true
	req := &dto.CreateJournalRequest{
		Date:    "2026-04-24",
		Content: "x",
		SourceRefs: []dto.SourceRefDTO{
			{SourceType: model.JournalSourceTypeEntry, SourceID: id.String()},
			{SourceType: model.JournalSourceTypeGcalEvent, SourceID: "gcal-1"},
		},
	}
	if _, _, err := svc.Create(context.Background(), req, ""); err != nil {
		t.Fatalf("Create: %v", err)
	}
}

func TestJournalSvc_Create_DuplicateDate(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	repo.createErr = model.NewAppError(409, model.ErrCodeJournalExists, "當日日記已存在")
	req := &dto.CreateJournalRequest{Date: "2026-04-24", Content: "x"}
	_, _, err := svc.Create(context.Background(), req, "")
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 409 || appErr.Code != model.ErrCodeJournalExists {
		t.Errorf("expected 409 JOURNAL_EXISTS, got %+v", appErr)
	}
}

func TestJournalSvc_GetByDate_NotFound(t *testing.T) {
	svc, _, _ := newJournalSvc(t)
	_, _, err := svc.GetByDate(context.Background(), "2026-04-24", "")
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 404 || appErr.Code != model.ErrCodeJournalNotFound {
		t.Errorf("expected 404 JOURNAL_NOT_FOUND, got %+v", appErr)
	}
}

func TestJournalSvc_GetByDate_OK(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	id := uuid.New()
	repo.getJournal = &model.Journal{ID: id, Content: "hello"}
	repo.getRefs = []model.JournalSourceRef{
		{JournalID: id, SourceType: "entry", SourceID: "e1"},
	}
	j, refs, err := svc.GetByDate(context.Background(), "2026-04-24", "")
	if err != nil {
		t.Fatalf("GetByDate: %v", err)
	}
	if j.ID != id {
		t.Error("wrong journal returned")
	}
	if len(refs) != 1 {
		t.Errorf("expected 1 ref, got %d", len(refs))
	}
}

func TestJournalSvc_Update_PreservesGeneratedBy(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	gen := model.GeneratedByLlm
	id := uuid.New()
	// repo.Update returns updated journal as-is（不動 generated_by）
	repo.updateRet = &model.Journal{
		ID:          id,
		Content:     "edited",
		IsDraft:     false,
		GeneratedBy: &gen, // 仍維持 llm
	}
	repo.getRefsRet = []model.JournalSourceRef{}

	newContent := "edited"
	isDraft := false
	req := &dto.UpdateJournalRequest{
		Content: &newContent,
		IsDraft: &isDraft,
	}
	j, _, err := svc.Update(context.Background(), "2026-04-24", "", req)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if j.IsDraft {
		t.Error("expected is_draft=false")
	}
	if j.GeneratedBy == nil || *j.GeneratedBy != model.GeneratedByLlm {
		t.Errorf("generated_by should remain 'llm', got %v", j.GeneratedBy)
	}
}

func TestJournalSvc_Update_NotFound(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	repo.updateErr = model.NewAppError(404, model.ErrCodeJournalNotFound, "當日尚無日記")
	_, _, err := svc.Update(context.Background(), "2026-04-24", "", &dto.UpdateJournalRequest{})
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 404 {
		t.Errorf("expected 404, got %d", appErr.Status)
	}
}

func TestJournalSvc_Update_ContentTooLong(t *testing.T) {
	svc, _, _ := newJournalSvc(t)
	long := make([]byte, 20001)
	for i := range long {
		long[i] = 'a'
	}
	s := string(long)
	req := &dto.UpdateJournalRequest{Content: &s}
	_, _, err := svc.Update(context.Background(), "2026-04-24", "", req)
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected INVALID_INPUT, got %s", appErr.Code)
	}
}

func TestJournalSvc_Delete(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	if err := svc.Delete(context.Background(), "2026-04-24", ""); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if !repo.deleteCalled {
		t.Error("repo.Delete not called")
	}
}

func TestJournalSvc_Delete_NotFound(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	repo.deleteErr = model.NewAppError(404, model.ErrCodeJournalNotFound, "當日尚無日記")
	err := svc.Delete(context.Background(), "2026-04-24", "")
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != 404 {
		t.Errorf("expected 404, got %d", appErr.Status)
	}
}

func TestJournalSvc_List_PassesOptions(t *testing.T) {
	svc, repo, _ := newJournalSvc(t)
	repo.listItems = []*model.Journal{{ID: uuid.New()}, {ID: uuid.New()}}
	repo.listTotal = 2

	mood := model.MoodOk
	isDraft := true
	since := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	until := time.Date(2026, 4, 30, 0, 0, 0, 0, time.UTC)

	items, total, err := svc.List(context.Background(), repository.JournalListOptions{
		Page:    2,
		PerPage: 10,
		Since:   &since,
		Until:   &until,
		Mood:    &mood,
		IsDraft: &isDraft,
	})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if total != 2 {
		t.Errorf("expected total=2, got %d", total)
	}
	if len(items) != 2 {
		t.Errorf("expected 2 items, got %d", len(items))
	}
	if repo.listOpts.Page != 2 || repo.listOpts.PerPage != 10 {
		t.Errorf("opts not propagated: %+v", repo.listOpts)
	}
	if repo.listOpts.Mood == nil || *repo.listOpts.Mood != model.MoodOk {
		t.Error("mood not propagated")
	}
}

// 防止 import 被 vet 視為未使用
var _ = pgx.ErrNoRows
