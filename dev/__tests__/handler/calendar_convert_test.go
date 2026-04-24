package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/handler"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
	gcal "google.golang.org/api/calendar/v3"
)

// ---------------------------------------------------------------------------
// Stubs（獨立於 service_test package 的 stubs；handler_test package 不能 import 它）
// ---------------------------------------------------------------------------

type fetcherStub struct {
	event *gcal.Event
	err   error
}

func (f *fetcherStub) GetEvent(ctx context.Context, calendarID, eventID string) (*gcal.Event, error) {
	return f.event, f.err
}

type repoStub struct {
	createErr error
}

func (r *repoStub) Create(ctx context.Context, entry *model.Entry) error { return r.createErr }
func (r *repoStub) FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *repoStub) List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error) {
	return nil, nil
}
func (r *repoStub) Update(ctx context.Context, entry *model.Entry) error { return nil }
func (r *repoStub) Delete(ctx context.Context, id uuid.UUID) error       { return nil }
func (r *repoStub) ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *repoStub) FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error) {
	return nil, nil, nil
}
func (r *repoStub) GetFlags(ctx context.Context, entryID uuid.UUID) ([]model.EntryFlag, error) {
	return nil, nil
}
func (r *repoStub) ExistsBySourceRef(ctx context.Context, sourceType, sourceRef string) (bool, error) {
	return false, nil
}
func (r *repoStub) CategoryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	return false, nil
}
func (r *repoStub) SupersedeEntry(ctx context.Context, oldID, newID uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *repoStub) ClearSupersede(ctx context.Context, id uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (r *repoStub) GetSupersedeChain(ctx context.Context, id uuid.UUID) ([]repository.HistoryItem, error) {
	return nil, nil
}
func (r *repoStub) CheckCircularSupersede(ctx context.Context, oldID, newID uuid.UUID) (bool, error) {
	return false, nil
}

// setupRouter 組一個最小化的 gin router，只含 F-026c route，不加 auth middleware。
func setupRouter(fetcher service.GcalEventFetcher, repo service.EntryRepository) *gin.Engine {
	gin.SetMode(gin.TestMode)
	svc := service.NewCalendarConvertService(fetcher, repo)
	h := handler.NewCalendarConvertHandler(svc)

	r := gin.New()
	r.POST("/api/v1/calendar/events/:gcal_id/to-entry", h.ConvertToEntry)
	return r
}

// 發送 POST 請求並回傳 (status, body)
func doPost(t *testing.T, r *gin.Engine, path, body string) (int, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var parsed map[string]any
	if w.Body.Len() > 0 {
		_ = json.Unmarshal(w.Body.Bytes(), &parsed)
	}
	return w.Code, parsed
}

// -----------------------------------------------------------------------------
// 201 Happy
// -----------------------------------------------------------------------------
func TestHandlerConvert_201(t *testing.T) {
	fetcher := &fetcherStub{event: &gcal.Event{Id: "e1", Summary: "Meet"}}
	repo := &repoStub{}
	r := setupRouter(fetcher, repo)
	status, body := doPost(t, r, "/api/v1/calendar/events/e1/to-entry", "{}")
	if status != http.StatusCreated {
		t.Fatalf("預期 201，實際 %d (body=%v)", status, body)
	}
}

// -----------------------------------------------------------------------------
// 409 ALREADY_LINKED
// -----------------------------------------------------------------------------
func TestHandlerConvert_409(t *testing.T) {
	fetcher := &fetcherStub{event: &gcal.Event{Id: "edup", Summary: "Dup"}}
	repo := &repoStub{
		createErr: model.NewAppError(409, model.ErrCodeAlreadyLinked, "此 Google Calendar event 已轉成 entry"),
	}
	r := setupRouter(fetcher, repo)
	status, body := doPost(t, r, "/api/v1/calendar/events/edup/to-entry", "{}")
	if status != http.StatusConflict {
		t.Fatalf("預期 409，實際 %d", status)
	}
	if body["code"] != model.ErrCodeAlreadyLinked {
		t.Errorf("預期 code=%s，實際 %v", model.ErrCodeAlreadyLinked, body["code"])
	}
}

// -----------------------------------------------------------------------------
// 424 GCAL_NOT_CONNECTED
// -----------------------------------------------------------------------------
func TestHandlerConvert_424(t *testing.T) {
	fetcher := &fetcherStub{err: model.NewAppError(424, model.ErrCodeGcalNotConnected, "尚未連接")}
	r := setupRouter(fetcher, &repoStub{})
	status, body := doPost(t, r, "/api/v1/calendar/events/e1/to-entry", "{}")
	if status != http.StatusFailedDependency {
		t.Fatalf("預期 424，實際 %d", status)
	}
	if body["code"] != model.ErrCodeGcalNotConnected {
		t.Errorf("預期 code=%s，實際 %v", model.ErrCodeGcalNotConnected, body["code"])
	}
}

// -----------------------------------------------------------------------------
// 502 GCAL_UPSTREAM_ERROR
// -----------------------------------------------------------------------------
func TestHandlerConvert_502(t *testing.T) {
	fetcher := &fetcherStub{err: model.NewAppError(502, model.ErrCodeGcalUpstream, "Google 上游錯誤")}
	r := setupRouter(fetcher, &repoStub{})
	status, _ := doPost(t, r, "/api/v1/calendar/events/e1/to-entry", "{}")
	if status != http.StatusBadGateway {
		t.Fatalf("預期 502，實際 %d", status)
	}
}

// -----------------------------------------------------------------------------
// 404 EVENT_NOT_FOUND
// -----------------------------------------------------------------------------
func TestHandlerConvert_404(t *testing.T) {
	fetcher := &fetcherStub{event: nil}
	r := setupRouter(fetcher, &repoStub{})
	status, body := doPost(t, r, "/api/v1/calendar/events/missing/to-entry", "{}")
	if status != http.StatusNotFound {
		t.Fatalf("預期 404，實際 %d", status)
	}
	if body["code"] != model.ErrCodeEventNotFound {
		t.Errorf("預期 code=%s，實際 %v", model.ErrCodeEventNotFound, body["code"])
	}
}

// -----------------------------------------------------------------------------
// 空 body 不應 400（body 為 optional）
// -----------------------------------------------------------------------------
func TestHandlerConvert_EmptyBody(t *testing.T) {
	fetcher := &fetcherStub{event: &gcal.Event{Id: "e1", Summary: "Meet"}}
	r := setupRouter(fetcher, &repoStub{})
	status, _ := doPost(t, r, "/api/v1/calendar/events/e1/to-entry", "")
	if status != http.StatusCreated {
		t.Fatalf("空 body 應 201，實際 %d", status)
	}
}
