package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

// ─── 共用 fake repos（與 service test 同形狀，但獨立避免 cross-package 依賴） ──

type fakeJournalRepo struct {
	createErr error

	getJournal *model.Journal
	getRefs    []model.JournalSourceRef

	updateRet *model.Journal
	updateErr error

	deleteErr error

	listItems []*model.Journal
	listTotal int64

	getRefsRet []model.JournalSourceRef
}

func (r *fakeJournalRepo) Create(ctx context.Context, j *model.Journal, refs []model.JournalSourceRef) error {
	if r.createErr != nil {
		return r.createErr
	}
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	now := time.Now()
	j.CreatedAt = now
	j.UpdatedAt = now
	r.getJournal = j
	r.getRefs = refs
	return nil
}
func (r *fakeJournalRepo) GetByDate(ctx context.Context, date time.Time) (*model.Journal, []model.JournalSourceRef, error) {
	if r.getJournal == nil {
		return nil, nil, nil
	}
	return r.getJournal, r.getRefs, nil
}
func (r *fakeJournalRepo) Update(ctx context.Context, date time.Time, patch *dto.UpdateJournalRequest) (*model.Journal, error) {
	if r.updateErr != nil {
		return nil, r.updateErr
	}
	return r.updateRet, nil
}
func (r *fakeJournalRepo) Delete(ctx context.Context, date time.Time) error { return r.deleteErr }
func (r *fakeJournalRepo) List(ctx context.Context, opts repository.JournalListOptions) ([]*model.Journal, int64, error) {
	return r.listItems, r.listTotal, nil
}
func (r *fakeJournalRepo) ReplaceSourceRefs(ctx context.Context, journalID uuid.UUID, refs []model.JournalSourceRef) error {
	return nil
}
func (r *fakeJournalRepo) GetSourceRefs(ctx context.Context, journalID uuid.UUID) ([]model.JournalSourceRef, error) {
	return r.getRefsRet, nil
}

// 最小 EntryRepository（FindByID 用 existing map）
type fakeEntryRepo struct {
	existing map[uuid.UUID]bool
}

func (r *fakeEntryRepo) Create(ctx context.Context, e *model.Entry) error { return nil }
func (r *fakeEntryRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	if r.existing[id] {
		return &model.Entry{ID: id}, nil
	}
	return nil, nil
}
func (r *fakeEntryRepo) List(ctx context.Context, f model.EntryFilter) (*model.EntryListResult, error) {
	return nil, nil
}
func (r *fakeEntryRepo) Update(ctx context.Context, e *model.Entry) error { return nil }
func (r *fakeEntryRepo) Delete(ctx context.Context, id uuid.UUID) error   { return nil }
func (r *fakeEntryRepo) ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *fakeEntryRepo) FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error) {
	return nil, nil, nil
}
func (r *fakeEntryRepo) GetFlags(ctx context.Context, id uuid.UUID) ([]model.EntryFlag, error) {
	return nil, nil
}
func (r *fakeEntryRepo) ExistsBySourceRef(ctx context.Context, st, sr string) (bool, error) {
	return false, nil
}
func (r *fakeEntryRepo) CategoryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	return false, nil
}
func (r *fakeEntryRepo) ListByDateRange(ctx context.Context, s, u, tz string) ([]dto.CalendarEntrySummary, error) {
	return nil, nil
}
func (r *fakeEntryRepo) SupersedeEntry(ctx context.Context, o, n uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *fakeEntryRepo) ClearSupersede(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *fakeEntryRepo) GetSupersedeChain(ctx context.Context, id uuid.UUID) ([]repository.HistoryItem, error) {
	return nil, nil
}
func (r *fakeEntryRepo) CheckCircularSupersede(ctx context.Context, o, n uuid.UUID) (bool, error) {
	return false, nil
}

// ─── helper ─────────────────────────────────────────────────────────────

func newJournalTestRouter(t *testing.T) (*gin.Engine, *fakeJournalRepo, *fakeEntryRepo) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	jr := &fakeJournalRepo{}
	er := &fakeEntryRepo{existing: map[uuid.UUID]bool{}}
	svc := service.NewJournalService(jr, er)
	h := NewJournalHandler(svc)

	r := gin.New()
	g := r.Group("/api/v1/journal")
	g.GET("", h.List)
	g.POST("", h.Create)
	g.GET("/:date", h.GetByDate)
	g.PATCH("/:date", h.Update)
	g.DELETE("/:date", h.Delete)
	return r, jr, er
}

func doReq(r *gin.Engine, method, path string, body any) *httptest.ResponseRecorder {
	var buf *bytes.Buffer
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewBuffer(b)
	} else {
		buf = bytes.NewBuffer(nil)
	}
	req := httptest.NewRequest(method, path, buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ─── Tests ──────────────────────────────────────────────────────────────

func TestJournalHandler_Create_201(t *testing.T) {
	r, _, _ := newJournalTestRouter(t)
	mood := "great"
	body := dto.CreateJournalRequest{
		Date:    "2026-04-24",
		Content: "Good day.",
		Mood:    &mood,
	}
	w := doReq(r, http.MethodPost, "/api/v1/journal", body)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d, body=%s", w.Code, w.Body.String())
	}
	var resp dto.JournalResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.IsDraft {
		t.Error("expected is_draft=false")
	}
	if resp.GeneratedBy == nil || *resp.GeneratedBy != "user" {
		t.Errorf("expected generated_by=user, got %v", resp.GeneratedBy)
	}
	if resp.Date != "2026-04-24" {
		t.Errorf("expected date 2026-04-24, got %s", resp.Date)
	}
}

func TestJournalHandler_Create_InvalidJSON(t *testing.T) {
	r, _, _ := newJournalTestRouter(t)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/journal", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestJournalHandler_Create_ContentTooLong(t *testing.T) {
	r, _, _ := newJournalTestRouter(t)
	long := strings.Repeat("a", 20001)
	body := dto.CreateJournalRequest{Date: "2026-04-24", Content: long}
	w := doReq(r, http.MethodPost, "/api/v1/journal", body)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
	var er dto.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &er)
	if er.Code != model.ErrCodeInvalidInput {
		t.Errorf("expected INVALID_INPUT, got %s", er.Code)
	}
}

func TestJournalHandler_Create_409Duplicate(t *testing.T) {
	r, jr, _ := newJournalTestRouter(t)
	jr.createErr = model.NewAppError(409, model.ErrCodeJournalExists, "當日日記已存在")
	body := dto.CreateJournalRequest{Date: "2026-04-24", Content: "x"}
	w := doReq(r, http.MethodPost, "/api/v1/journal", body)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", w.Code)
	}
	var er dto.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &er)
	if er.Code != model.ErrCodeJournalExists {
		t.Errorf("expected JOURNAL_EXISTS, got %s", er.Code)
	}
}

func TestJournalHandler_GetByDate_404(t *testing.T) {
	r, _, _ := newJournalTestRouter(t)
	w := doReq(r, http.MethodGet, "/api/v1/journal/2026-04-24", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
	var er dto.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &er)
	if er.Code != model.ErrCodeJournalNotFound {
		t.Errorf("expected JOURNAL_NOT_FOUND, got %s", er.Code)
	}
}

func TestJournalHandler_GetByDate_200(t *testing.T) {
	r, jr, _ := newJournalTestRouter(t)
	id := uuid.New()
	gen := "user"
	jr.getJournal = &model.Journal{
		ID:          id,
		Date:        time.Date(2026, 4, 24, 0, 0, 0, 0, time.UTC),
		Content:     "hello",
		IsDraft:     false,
		GeneratedBy: &gen,
		Highlights:  []string{"a"},
	}
	jr.getRefs = []model.JournalSourceRef{
		{JournalID: id, SourceType: "entry", SourceID: "e1"},
	}
	w := doReq(r, http.MethodGet, "/api/v1/journal/2026-04-24", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", w.Code, w.Body.String())
	}
	var resp dto.JournalResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Date != "2026-04-24" {
		t.Errorf("expected date 2026-04-24, got %s", resp.Date)
	}
	if len(resp.SourceRefs) != 1 {
		t.Errorf("expected 1 source_ref, got %d", len(resp.SourceRefs))
	}
}

func TestJournalHandler_Update_200_PreservesGeneratedBy(t *testing.T) {
	r, jr, _ := newJournalTestRouter(t)
	gen := "llm"
	jr.updateRet = &model.Journal{
		ID:          uuid.New(),
		Date:        time.Date(2026, 4, 24, 0, 0, 0, 0, time.UTC),
		Content:     "edited",
		IsDraft:     false,
		GeneratedBy: &gen,
	}
	patch := dto.UpdateJournalRequest{}
	c := "edited"
	patch.Content = &c
	f := false
	patch.IsDraft = &f

	w := doReq(r, http.MethodPatch, "/api/v1/journal/2026-04-24", patch)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", w.Code, w.Body.String())
	}
	var resp dto.JournalResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.IsDraft {
		t.Error("expected is_draft=false")
	}
	if resp.GeneratedBy == nil || *resp.GeneratedBy != "llm" {
		t.Errorf("expected generated_by=llm, got %v", resp.GeneratedBy)
	}
}

func TestJournalHandler_Update_404(t *testing.T) {
	r, jr, _ := newJournalTestRouter(t)
	jr.updateErr = model.NewAppError(404, model.ErrCodeJournalNotFound, "當日尚無日記")
	w := doReq(r, http.MethodPatch, "/api/v1/journal/2026-04-24", dto.UpdateJournalRequest{})
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestJournalHandler_Delete_204(t *testing.T) {
	r, _, _ := newJournalTestRouter(t)
	w := doReq(r, http.MethodDelete, "/api/v1/journal/2026-04-24", nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
}

func TestJournalHandler_Delete_404(t *testing.T) {
	r, jr, _ := newJournalTestRouter(t)
	jr.deleteErr = model.NewAppError(404, model.ErrCodeJournalNotFound, "x")
	w := doReq(r, http.MethodDelete, "/api/v1/journal/2026-04-24", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestJournalHandler_List_200(t *testing.T) {
	r, jr, _ := newJournalTestRouter(t)
	jr.listItems = []*model.Journal{
		{ID: uuid.New(), Date: time.Date(2026, 4, 24, 0, 0, 0, 0, time.UTC)},
		{ID: uuid.New(), Date: time.Date(2026, 4, 23, 0, 0, 0, 0, time.UTC)},
	}
	jr.listTotal = 2

	w := doReq(r, http.MethodGet, "/api/v1/journal?since=2026-04-01&until=2026-04-30&mood=ok&is_draft=false&page=1&per_page=10", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", w.Code, w.Body.String())
	}
	var resp dto.ListJournalResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
	if resp.Pagination.Total != 2 {
		t.Errorf("expected total=2, got %d", resp.Pagination.Total)
	}
	if resp.Pagination.TotalPages != 1 {
		t.Errorf("expected total_pages=1, got %d", resp.Pagination.TotalPages)
	}
}

func TestJournalHandler_List_InvalidQuery(t *testing.T) {
	r, _, _ := newJournalTestRouter(t)
	cases := []string{
		"/api/v1/journal?page=abc",
		"/api/v1/journal?per_page=-1",
		"/api/v1/journal?since=bad-date",
		"/api/v1/journal?until=bad-date",
		"/api/v1/journal?mood=invalid",
		"/api/v1/journal?is_draft=notbool",
	}
	for _, p := range cases {
		w := doReq(r, http.MethodGet, p, nil)
		if w.Code != http.StatusBadRequest {
			t.Errorf("[%s] expected 400, got %d", p, w.Code)
		}
	}
}

func TestFormatJournalDate(t *testing.T) {
	d := time.Date(2026, 4, 24, 0, 0, 0, 0, time.UTC)
	if got := formatJournalDate(d); got != "2026-04-24" {
		t.Errorf("expected 2026-04-24, got %s", got)
	}
}
