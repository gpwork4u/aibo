package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/handler"
	"github.com/gpwork4u/aibo/service"
)

// setupAggregateRouter 組一個最小化的 gin router，含 CalendarHandler（F-026b）。
//
// 以 mockEntryRepo / stubGcalRepo（來自 service_test package 之同名 symbol 無法跨 package 共用）
// 建構 real CalendarService。為了跨 package，這裡只實作必要的 stub。
type handlerAggregateStubGcalRepo struct{ integration *dummyIntegration }
type dummyIntegration struct{}

// 小型 repo stub 允許 Get(ctx) → (nil, nil) 代表未連
type haggStubRepo struct {
	connected bool
}

// 遵守 service.GcalIntegrationRepository 介面（實際跨 package 不會共用 ptr，故 import）
// 其他方法空實作於此。

// setupAggregateRouter 把 service 組合好並 mount route
func setupAggregateRouter(t *testing.T, connected bool, cacheEnabled bool) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	entryRepo := &hEntryRepo{}
	var gcalRepo hAggGcalRepo
	gcalRepo.connected = connected
	gcalSvc := service.NewGcalService(&gcalRepo, nil, nil, &service.GcalConfig{})

	svc := service.NewCalendarService(entryRepo, gcalSvc, cacheEnabled)
	h := handler.NewCalendarHandler(svc)

	r := gin.New()
	r.GET("/api/v1/calendar", h.Aggregate)
	return r
}

// doGet 發送 GET 並取得 (status, headers, body)
func doGet(t *testing.T, r *gin.Engine, url string) (int, http.Header, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, url, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var body map[string]any
	if w.Body.Len() > 0 {
		_ = json.Unmarshal(w.Body.Bytes(), &body)
	}
	return w.Code, w.Header(), body
}

// -----------------------------------------------------------------------------
// include_gcal=true 明確要求但未連 → 424
// -----------------------------------------------------------------------------
func TestAggregate_IncludeGcalExplicitTrue_NotConnected_Returns424(t *testing.T) {
	r := setupAggregateRouter(t, false, false)
	status, _, body := doGet(t, r, "/api/v1/calendar?since=2026-04-24&until=2026-04-24&view=day&include_gcal=true")
	if status != http.StatusFailedDependency {
		t.Fatalf("預期 424，實際 %d (body=%v)", status, body)
	}
	if body["code"] != "GCAL_NOT_CONNECTED" {
		t.Errorf("預期 code=GCAL_NOT_CONNECTED，實際 %v", body["code"])
	}
}

// -----------------------------------------------------------------------------
// 不帶 include_gcal（預設）未連 → 200 + gcal_connected=false + X-Degraded
// -----------------------------------------------------------------------------
func TestAggregate_IncludeGcalOmitted_NotConnected_ReturnsDegraded(t *testing.T) {
	r := setupAggregateRouter(t, false, false)
	status, header, body := doGet(t, r, "/api/v1/calendar?since=2026-04-24&until=2026-04-24&view=day")
	if status != http.StatusOK {
		t.Fatalf("預期 200 degraded，實際 %d (body=%v)", status, body)
	}
	if header.Get("X-Degraded") != "gcal" {
		t.Errorf("預期 X-Degraded: gcal，實際 %q", header.Get("X-Degraded"))
	}
	connected, _ := body["gcal_connected"].(bool)
	if connected {
		t.Error("預期 gcal_connected=false")
	}
}

// -----------------------------------------------------------------------------
// include_gcal=false 未連 → 200（完全跳過 gcal，不算 degraded）
// -----------------------------------------------------------------------------
func TestAggregate_IncludeGcalFalse_NotConnected_Returns200(t *testing.T) {
	r := setupAggregateRouter(t, false, false)
	status, header, _ := doGet(t, r, "/api/v1/calendar?since=2026-04-24&until=2026-04-24&view=day&include_gcal=false")
	if status != http.StatusOK {
		t.Fatalf("預期 200，實際 %d", status)
	}
	// 跳過 gcal 時不應標 degraded（連都沒嘗試）
	if header.Get("X-Degraded") != "" {
		t.Errorf("include_gcal=false 時不應有 X-Degraded header，實際 %q", header.Get("X-Degraded"))
	}
}

// -----------------------------------------------------------------------------
// since/until 缺失 → 400
// -----------------------------------------------------------------------------
func TestAggregate_MissingSinceUntil_Returns400(t *testing.T) {
	r := setupAggregateRouter(t, false, false)
	status, _, _ := doGet(t, r, "/api/v1/calendar?view=day")
	if status != http.StatusBadRequest {
		t.Errorf("預期 400，實際 %d", status)
	}
}

// -----------------------------------------------------------------------------
// view 不合法 → 400
// -----------------------------------------------------------------------------
func TestAggregate_InvalidView_Returns400(t *testing.T) {
	r := setupAggregateRouter(t, false, false)
	status, _, body := doGet(t, r, "/api/v1/calendar?since=2026-04-24&until=2026-04-24&view=year")
	if status != http.StatusBadRequest {
		t.Errorf("預期 400，實際 %d (body=%v)", status, body)
	}
}

// -----------------------------------------------------------------------------
// include_gcal 格式錯誤 → 400
// -----------------------------------------------------------------------------
func TestAggregate_InvalidIncludeGcal_Returns400(t *testing.T) {
	r := setupAggregateRouter(t, false, false)
	status, _, _ := doGet(t, r, "/api/v1/calendar?since=2026-04-24&until=2026-04-24&view=day&include_gcal=yes")
	if status != http.StatusBadRequest {
		t.Errorf("預期 400，實際 %d", status)
	}
}

// -----------------------------------------------------------------------------
// 超過 92 天 → 400
// -----------------------------------------------------------------------------
func TestAggregate_Span93Days_Returns400(t *testing.T) {
	r := setupAggregateRouter(t, false, false)
	status, _, body := doGet(t, r, "/api/v1/calendar?since=2026-01-01&until=2026-04-03&view=month&include_gcal=false")
	if status != http.StatusBadRequest {
		t.Errorf("預期 400（超過 92 天），實際 %d (body=%v)", status, body)
	}
}

// 以下為 hAggGcalRepo / hEntryRepo minimal stubs（無法跨 package 使用 service_test 裡的 mockEntryRepo）
// 透過獨立檔案 handler_calendar_stubs_test.go 提供。

// 這個檔案內用到的 interface 抽象化，避免此檔 import cycle。
// 具體 stub 定義位於 handler_calendar_stubs_test.go
var _ dto.ErrorResponse // keep dto import alive
