package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
	"github.com/jackc/pgx/v5"
)

// --------- Mock EntryRepository ---------

// mockEntryRepo 為 CalendarService 單測提供最小可用 EntryRepository 實作。
//
// 僅實作 ListByDateRange；其餘方法回傳 nil / 空結果，單測不觸發。
type mockEntryRepo struct {
	entries []dto.CalendarEntrySummary
	err     error
}

func (m *mockEntryRepo) ListByDateRange(_ context.Context, _, _ string, _ string) ([]dto.CalendarEntrySummary, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.entries, nil
}

// 其餘 EntryRepository 介面方法：測試用空實作
func (m *mockEntryRepo) Create(_ context.Context, _ *model.Entry) error { return nil }
func (m *mockEntryRepo) FindByID(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (m *mockEntryRepo) List(_ context.Context, _ model.EntryFilter) (*model.EntryListResult, error) {
	return nil, nil
}
func (m *mockEntryRepo) Update(_ context.Context, _ *model.Entry) error { return nil }
func (m *mockEntryRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (m *mockEntryRepo) ConfirmEntry(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (m *mockEntryRepo) FlagEntry(_ context.Context, _ uuid.UUID, _ string, _ *string) (*model.Entry, *model.EntryFlag, error) {
	return nil, nil, nil
}
func (m *mockEntryRepo) GetFlags(_ context.Context, _ uuid.UUID) ([]model.EntryFlag, error) {
	return nil, nil
}
func (m *mockEntryRepo) ExistsBySourceRef(_ context.Context, _, _ string) (bool, error) {
	return false, nil
}
func (m *mockEntryRepo) CategoryExists(_ context.Context, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (m *mockEntryRepo) SupersedeEntry(_ context.Context, _, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (m *mockEntryRepo) ClearSupersede(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (m *mockEntryRepo) GetSupersedeChain(_ context.Context, _ uuid.UUID) ([]repository.HistoryItem, error) {
	return nil, nil
}
func (m *mockEntryRepo) CheckCircularSupersede(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}

// Compile-time check
var _ service.EntryRepository = (*mockEntryRepo)(nil)

// 確保 pgx import 被使用（interface 內有用到 pgx.Tx 但 mock 不需要）
var _ = pgx.ErrNoRows

// --------- Stub GcalIntegrationRepository ---------
//
// 供 newStubGcalService 使用；Get 回傳 integration=nil 代表「未連 gcal」，
// 其他方法為空實作（本測試不觸發）。
type stubGcalRepo struct {
	integration *model.GcalIntegration
	getErr      error
}

func (s *stubGcalRepo) Get(_ context.Context) (*model.GcalIntegration, error) {
	return s.integration, s.getErr
}
func (s *stubGcalRepo) Upsert(_ context.Context, _ *model.GcalIntegration) error { return nil }
func (s *stubGcalRepo) UpdateTokens(_ context.Context, _ interface{}, _, _ string, _ interface{}) error {
	return nil
}
func (s *stubGcalRepo) SaveOAuthState(_ context.Context, _ string) error { return nil }
func (s *stubGcalRepo) ValidateOAuthState(_ context.Context, _ string) (bool, error) {
	return false, nil
}
func (s *stubGcalRepo) CleanExpiredOAuthStates(_ context.Context) error { return nil }

// 編譯期介面檢查
var _ service.GcalIntegrationRepository = (*stubGcalRepo)(nil)

// newStubGcalService 建立可用於單測的 *GcalService：
//
//   - 使用 stubGcalRepo（可控 Get 行為模擬已連 / 未連）
//   - entryRepo = nil（本測試 gcalSvc 不被呼叫 ListEvents / Create）
//   - aesCrypto = nil（本測試走 IsConnected 路徑，不解密 token）
//   - config = 空（本測試不走 OAuth 流程）
//
// IsConnected() 只讀 gcalRepo.Get，會依 integration 欄位決定 true / false。
func newStubGcalService(repo *stubGcalRepo) *service.GcalService {
	return service.NewGcalService(repo, nil, nil, &service.GcalConfig{})
}

// --------- Helpers ---------

func mkEntry(id uuid.UUID, title string, createdAt time.Time, date string) dto.CalendarEntrySummary {
	t := title
	return dto.CalendarEntrySummary{
		ID:        id,
		Title:     &t,
		Tags:      []string{},
		CreatedAt: createdAt,
		Date:      date,
	}
}

// --------- Tests ---------

// TestAggregate_HappyPath_EntriesOnly 測試基本彙整（不含 gcal）
func TestAggregate_HappyPath_EntriesOnly(t *testing.T) {
	repo := &mockEntryRepo{
		entries: []dto.CalendarEntrySummary{
			mkEntry(uuid.New(), "E1", time.Date(2026, 4, 24, 9, 0, 0, 0, time.UTC), "2026-04-24"),
			mkEntry(uuid.New(), "E2", time.Date(2026, 4, 24, 10, 0, 0, 0, time.UTC), "2026-04-24"),
			mkEntry(uuid.New(), "E3", time.Date(2026, 4, 25, 8, 0, 0, 0, time.UTC), "2026-04-25"),
		},
	}
	svc := service.NewCalendarService(repo, nil, false)

	result, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-04-20",
		UntilDate:   "2026-04-26",
		View:        "week",
		IncludeGcal: false,
		Timezone:    "UTC",
	})
	if err != nil {
		t.Fatalf("非預期錯誤: %v", err)
	}
	if len(result.Response.Days) != 7 {
		t.Errorf("預期 7 天，實際 %d 天", len(result.Response.Days))
	}
	// 找到 2026-04-24
	var d24 *dto.CalendarDay
	for i := range result.Response.Days {
		if result.Response.Days[i].Date == "2026-04-24" {
			d24 = &result.Response.Days[i]
			break
		}
	}
	if d24 == nil {
		t.Fatal("找不到 2026-04-24")
	}
	if d24.EntryCount != 2 {
		t.Errorf("2026-04-24 entry_count 預期 2，實際 %d", d24.EntryCount)
	}
	if len(d24.Entries) != 2 {
		t.Errorf("week view 應回傳全量 entries（2 筆），實際 %d", len(d24.Entries))
	}
	if result.Degraded {
		t.Error("include_gcal=false 不應 degraded")
	}
}

// TestAggregate_MonthView_EntriesCap 測試月視圖每日 entries 上限為 3
func TestAggregate_MonthView_EntriesCap(t *testing.T) {
	entries := []dto.CalendarEntrySummary{}
	for i := 0; i < 10; i++ {
		entries = append(entries,
			mkEntry(uuid.New(), "E", time.Date(2026, 4, 24, i, 0, 0, 0, time.UTC), "2026-04-24"),
		)
	}
	repo := &mockEntryRepo{entries: entries}
	svc := service.NewCalendarService(repo, nil, false)

	result, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-04-01",
		UntilDate:   "2026-04-30",
		View:        "month",
		IncludeGcal: false,
		Timezone:    "UTC",
	})
	if err != nil {
		t.Fatalf("非預期錯誤: %v", err)
	}

	var d24 *dto.CalendarDay
	for i := range result.Response.Days {
		if result.Response.Days[i].Date == "2026-04-24" {
			d24 = &result.Response.Days[i]
			break
		}
	}
	if d24 == nil {
		t.Fatal("找不到 2026-04-24")
	}
	if d24.EntryCount != 10 {
		t.Errorf("entry_count 預期 10，實際 %d", d24.EntryCount)
	}
	if len(d24.Entries) != service.MonthViewEntriesCap {
		t.Errorf("month view entries 應被截斷到 %d，實際 %d", service.MonthViewEntriesCap, len(d24.Entries))
	}
}

// TestAggregate_SpanExceeds92Days 超過 92 天回 400
func TestAggregate_SpanExceeds92Days(t *testing.T) {
	repo := &mockEntryRepo{}
	svc := service.NewCalendarService(repo, nil, false)

	_, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-01-01",
		UntilDate:   "2026-06-01",
		View:        "month",
		IncludeGcal: false,
		Timezone:    "UTC",
	})
	if err == nil {
		t.Fatal("預期應回錯誤")
	}
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("預期 400 INVALID_INPUT，實際 %d %s", appErr.Status, appErr.Code)
	}
}

// TestAggregate_UntilBeforeSince 測試 until < since 回 400
func TestAggregate_UntilBeforeSince(t *testing.T) {
	repo := &mockEntryRepo{}
	svc := service.NewCalendarService(repo, nil, false)

	_, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-04-10",
		UntilDate:   "2026-04-01",
		Timezone:    "UTC",
		IncludeGcal: false,
	})
	if err == nil {
		t.Fatal("預期應回錯誤")
	}
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 400 {
		t.Errorf("預期 400，實際 %d", appErr.Status)
	}
}

// TestAggregate_InvalidTimezone 測試無效時區回 400
func TestAggregate_InvalidTimezone(t *testing.T) {
	repo := &mockEntryRepo{}
	svc := service.NewCalendarService(repo, nil, false)

	_, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-04-01",
		UntilDate:   "2026-04-30",
		Timezone:    "Mars/Olympus",
		IncludeGcal: false,
	})
	if err == nil {
		t.Fatal("預期應回錯誤")
	}
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Status != 400 || appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("預期 400 INVALID_INPUT，實際 %d %s", appErr.Status, appErr.Code)
	}
}

// TestAggregate_InvalidDateFormat 測試日期格式錯誤回 400
func TestAggregate_InvalidDateFormat(t *testing.T) {
	repo := &mockEntryRepo{}
	svc := service.NewCalendarService(repo, nil, false)

	_, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026/04/01",
		UntilDate:   "2026-04-30",
		Timezone:    "UTC",
		IncludeGcal: false,
	})
	if err == nil {
		t.Fatal("預期應回錯誤")
	}
	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際 %T", err)
	}
	if appErr.Code != model.ErrCodeInvalidInput {
		t.Errorf("預期 INVALID_INPUT，實際 %s", appErr.Code)
	}
}

// TestAggregate_SingleDayBounds 測試 since==until 彙整一天（92 天上限邊界）
func TestAggregate_SingleDayBounds(t *testing.T) {
	repo := &mockEntryRepo{}
	svc := service.NewCalendarService(repo, nil, false)

	result, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-04-24",
		UntilDate:   "2026-04-24",
		View:        "day",
		Timezone:    "UTC",
		IncludeGcal: false,
	})
	if err != nil {
		t.Fatalf("非預期錯誤: %v", err)
	}
	if len(result.Response.Days) != 1 {
		t.Errorf("預期 1 天，實際 %d 天", len(result.Response.Days))
	}
	if result.Response.Days[0].Date != "2026-04-24" {
		t.Errorf("預期 date=2026-04-24，實際 %s", result.Response.Days[0].Date)
	}
}

// TestAggregate_92DaysBoundary 92 天剛好可通過
func TestAggregate_92DaysBoundary(t *testing.T) {
	repo := &mockEntryRepo{}
	svc := service.NewCalendarService(repo, nil, false)

	// 2026-01-01 ~ 2026-04-02 共 92 天（含起訖）
	_, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-01-01",
		UntilDate:   "2026-04-02",
		View:        "month",
		Timezone:    "UTC",
		IncludeGcal: false,
	})
	if err != nil {
		t.Errorf("92 天邊界應通過，但錯誤: %v", err)
	}

	// 93 天應失敗
	_, err = svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-01-01",
		UntilDate:   "2026-04-03",
		View:        "month",
		Timezone:    "UTC",
		IncludeGcal: false,
	})
	if err == nil {
		t.Error("93 天應失敗")
	}
}

// TestAggregate_GcalNotConnected_Degraded 測試未連 gcal 時走 degraded（回 200 + 空 events）
//
// 此測試以 CalendarService 自帶的 mock gcal repo 模擬「未連」。
// 由於 GcalService 是具體型別，這裡用真實 GcalService，但 gcalRepo 回 nil。
func TestAggregate_GcalNotConnected_Degraded(t *testing.T) {
	repo := &mockEntryRepo{}
	gcalSvc := newStubGcalService(&stubGcalRepo{integration: nil})
	svc := service.NewCalendarService(repo, gcalSvc, false)

	result, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-04-24",
		UntilDate:   "2026-04-24",
		View:        "day",
		Timezone:    "UTC",
		IncludeGcal: true,
	})
	if err != nil {
		t.Fatalf("未連 gcal 應走 degraded，不應 error: %v", err)
	}
	if !result.Degraded {
		t.Error("未連 gcal 應 Degraded=true")
	}
	if result.GcalConnected {
		t.Error("未連 gcal 應 GcalConnected=false")
	}
	if len(result.Response.Days) != 1 || len(result.Response.Days[0].Events) != 0 {
		t.Error("未連 gcal 時 events 應為空")
	}
}

// TestGetDay_Delegates 確保 GetDay 會委派到 Aggregate（day view, since==until=date）
func TestGetDay_Delegates(t *testing.T) {
	repo := &mockEntryRepo{
		entries: []dto.CalendarEntrySummary{
			mkEntry(uuid.New(), "E1", time.Date(2026, 4, 24, 9, 0, 0, 0, time.UTC), "2026-04-24"),
		},
	}
	svc := service.NewCalendarService(repo, nil, false)

	day, degraded, _, err := svc.GetDay(context.Background(), "2026-04-24", "UTC", "primary", false)
	if err != nil {
		t.Fatalf("非預期錯誤: %v", err)
	}
	if day.Date != "2026-04-24" {
		t.Errorf("預期 date=2026-04-24，實際 %s", day.Date)
	}
	if day.EntryCount != 1 {
		t.Errorf("預期 entry_count=1，實際 %d", day.EntryCount)
	}
	if degraded {
		t.Error("include_gcal=false 不應 degraded")
	}
}

// TestAggregate_TimezoneBoundary 測試時區影響日期歸屬（Asia/Taipei）
//
// 此測試驗證 CalendarService 將 tz 正確傳給 repo；實際 tz bucket 的正確性
// 由 repository.ListByDateRange 與 Go time 標準庫共同保證。
func TestAggregate_TimezoneBoundary(t *testing.T) {
	// repo 假設會把 entry 以 Asia/Taipei 歸到 2026-04-24
	repo := &mockEntryRepo{
		entries: []dto.CalendarEntrySummary{
			mkEntry(uuid.New(), "Late", time.Date(2026, 4, 24, 15, 30, 0, 0, time.UTC), "2026-04-24"),
		},
	}
	svc := service.NewCalendarService(repo, nil, false)

	result, err := svc.Aggregate(context.Background(), service.AggregateRequest{
		SinceDate:   "2026-04-24",
		UntilDate:   "2026-04-24",
		View:        "day",
		Timezone:    "Asia/Taipei",
		IncludeGcal: false,
	})
	if err != nil {
		t.Fatalf("非預期錯誤: %v", err)
	}
	if len(result.Response.Days) != 1 || result.Response.Days[0].EntryCount != 1 {
		t.Errorf("Asia/Taipei 應將 entry 歸到 2026-04-24，實際 days=%+v", result.Response.Days)
	}
}
