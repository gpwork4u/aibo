package service

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"log/slog"
	"sort"
	"sync"
	"time"

	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"google.golang.org/api/calendar/v3"
)

// MonthViewEntriesCap 月視圖每日 entries 最多筆數（超過則看 entry_count）
const MonthViewEntriesCap = 3

// gcalCacheTTL gcal 事件的 in-memory 快取壽命
const gcalCacheTTL = 5 * time.Minute

// AggregateRequest 行事曆彙整請求
//
// 由 handler 把 HTTP 層的 query/header 參數解析後傳入；
// service 不讀取 gin context。
type AggregateRequest struct {
	SinceDate   string // YYYY-MM-DD（以 Timezone 時區解讀）
	UntilDate   string // YYYY-MM-DD
	View        string // month | week | day
	IncludeGcal bool
	CalendarID  string
	Timezone    string // IANA，空字串代表 UTC
}

// AggregateResult 行事曆彙整結果
//
// Degraded=true 時 handler 應加回應 header `X-Degraded: gcal`。
// GcalConnected=false 代表使用者尚未連 gcal（當 include_gcal=true 時亦走 degraded）。
type AggregateResult struct {
	Response      *dto.CalendarResponse
	Degraded      bool
	GcalConnected bool
}

// CalendarService 行事曆彙整服務
//
// 實作 F-026 spec：read-through 合併 entries + gcal events，不落 DB。
// gcal events 採用 in-memory 5 分鐘快取；entries 每次打 DB。
type CalendarService struct {
	entryRepo EntryRepository
	gcalSvc   *GcalService

	// gcal events cache（key: sha1(calendarID+since+until)）
	cacheMu      sync.Mutex
	cache        map[string]*gcalCacheEntry
	cacheEnabled bool
}

type gcalCacheEntry struct {
	events    []*calendar.Event
	expiresAt time.Time
}

// NewCalendarService 建立新的 CalendarService
//
// cacheEnabled=false 可關閉 in-memory cache（測試方便）。
func NewCalendarService(entryRepo EntryRepository, gcalSvc *GcalService, cacheEnabled bool) *CalendarService {
	return &CalendarService{
		entryRepo:    entryRepo,
		gcalSvc:      gcalSvc,
		cache:        make(map[string]*gcalCacheEntry),
		cacheEnabled: cacheEnabled,
	}
}

// Aggregate 依 since..until 彙整 entries + gcal events 為 CalendarResponse
//
// Degraded 策略：
//   - IncludeGcal=false → 完全跳過 gcal（不算 degraded）
//   - IncludeGcal=true 且未連 gcal → degraded（空 events），GcalConnected=false
//   - IncludeGcal=true 且 gcal upstream 失敗 → degraded（空 events），GcalConnected=true
//
// 注意：若 handler 希望「未連 gcal 時回 424」，應在呼叫前自行檢查 IsConnected；
// 此方法本身不區分「未連」與「連了但失敗」的狀態碼，僅以旗標回報，由 handler 決定語意。
func (s *CalendarService) Aggregate(ctx context.Context, req AggregateRequest) (*AggregateResult, error) {
	// 參數預設值
	tz := req.Timezone
	if tz == "" {
		tz = "UTC"
	}
	view := req.View
	if view == "" {
		view = "month"
	}
	calendarID := req.CalendarID
	if calendarID == "" {
		calendarID = "primary"
	}

	// 驗證時區
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "無效的時區")
	}

	// 解析日期
	sinceLocal, err := time.ParseInLocation("2006-01-02", req.SinceDate, loc)
	if err != nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "無效的 since 日期格式，需 YYYY-MM-DD")
	}
	untilLocal, err := time.ParseInLocation("2006-01-02", req.UntilDate, loc)
	if err != nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "無效的 until 日期格式，需 YYYY-MM-DD")
	}

	// until >= since
	if untilLocal.Before(sinceLocal) {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "until 必須 >= since")
	}
	// 跨度 <= 92 天（包含起訖日）
	spanDays := int(untilLocal.Sub(sinceLocal).Hours()/24) + 1
	if spanDays > 92 {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "日期跨度不得超過 92 天")
	}

	// 1) 撈 entries
	entries, err := s.entryRepo.ListByDateRange(ctx, req.SinceDate, req.UntilDate, tz)
	if err != nil {
		return nil, err
	}

	// 2) 撈 gcal events（read-through + degraded）
	degraded := false
	gcalConnected := true
	var events []*calendar.Event

	if req.IncludeGcal {
		events, gcalConnected, err = s.fetchGcalEvents(ctx, calendarID, sinceLocal, untilLocal, loc)
		if err != nil {
			// upstream 失敗 → degraded，仍回 entries
			slog.WarnContext(ctx, "calendar.gcal_degraded", "error", err)
			degraded = true
			events = nil
		}
		if !gcalConnected {
			// 未連 gcal → 由 handler 決定 424 或 degraded；這裡當 degraded
			degraded = true
		}
	}

	// 3) 建立每日 bucket（since..until 每一天一筆 CalendarDay）
	days := buildDayBuckets(sinceLocal, untilLocal, loc)

	// 4) 把 entries 分桶
	for _, e := range entries {
		if bucket, ok := days[e.Date]; ok {
			bucket.Entries = append(bucket.Entries, e)
		}
	}

	// 5) 把 events 分桶（歸屬到 start 所在日；跨日 event 在 week/day view 於每天都顯示）
	for _, ev := range events {
		summary := convertGcalEvent(ev, loc)
		if summary == nil {
			continue
		}
		assignEventToDays(days, summary, view, loc)
	}

	// 6) 按 view 調整 entry 上限
	orderedDates := orderedDates(sinceLocal, untilLocal, loc)
	outDays := make([]dto.CalendarDay, 0, len(orderedDates))
	totalEntries, totalEvents := 0, 0
	for _, d := range orderedDates {
		b := days[d]
		// 確保每日 entries 以 created_at ASC 排序（repository 已 ORDER BY created_at ASC，
		// 分桶後仍保序；events 則依 start ASC 排序）
		sort.SliceStable(b.Events, func(i, j int) bool {
			return b.Events[i].Start.Before(b.Events[j].Start)
		})

		b.EntryCount = len(b.Entries)
		b.EventCount = len(b.Events)
		totalEntries += b.EntryCount
		totalEvents += b.EventCount

		// month view：entries 限制 MonthViewEntriesCap
		if view == "month" && len(b.Entries) > MonthViewEntriesCap {
			b.Entries = b.Entries[:MonthViewEntriesCap]
		}

		outDays = append(outDays, *b)
	}

	resp := &dto.CalendarResponse{
		Since: req.SinceDate,
		Until: req.UntilDate,
		Days:  outDays,
	}

	slog.InfoContext(ctx, "calendar.aggregate",
		"since", req.SinceDate,
		"until", req.UntilDate,
		"view", view,
		"tz", tz,
		"degraded", degraded,
		"gcal_connected", gcalConnected,
		"entries_total", totalEntries,
		"events_total", totalEvents,
	)

	return &AggregateResult{
		Response:      resp,
		Degraded:      degraded,
		GcalConnected: gcalConnected,
	}, nil
}

// GetDay 取得單日彙整
//
// date 以 tz 時區解讀；entries/events 全量回傳（不套用 month view 的 3 筆上限）。
// GcalConnected=false 或 gcal 失敗時走 degraded（events 空，Degraded=true）。
//
// 回傳除了 CalendarDay 本體外，也透過 AggregateResult 包裝 Degraded 旗標。
func (s *CalendarService) GetDay(
	ctx context.Context,
	dateStr string,
	tz, calendarID string,
	includeGcal bool,
) (*dto.CalendarDay, bool, bool, error) {
	// 直接複用 Aggregate 邏輯，but view=day + since=until=date
	result, err := s.Aggregate(ctx, AggregateRequest{
		SinceDate:   dateStr,
		UntilDate:   dateStr,
		View:        "day",
		IncludeGcal: includeGcal,
		CalendarID:  calendarID,
		Timezone:    tz,
	})
	if err != nil {
		return nil, false, false, err
	}
	if len(result.Response.Days) == 0 {
		// 理論上不會發生（至少有 1 天）
		return &dto.CalendarDay{Date: dateStr, Entries: []dto.CalendarEntrySummary{}, Events: []dto.CalendarEventSummary{}}, result.Degraded, result.GcalConnected, nil
	}
	day := result.Response.Days[0]
	return &day, result.Degraded, result.GcalConnected, nil
}

// fetchGcalEvents 讀取 gcal events（含 5 分鐘 in-memory 快取）
//
// 回傳 (events, gcalConnected, err)：
//   - gcalConnected=false 時 events 為 nil 且 err 為 nil（由呼叫端走 degraded）
//   - 其他 upstream 失敗時 err != nil（由呼叫端走 degraded）
func (s *CalendarService) fetchGcalEvents(
	ctx context.Context,
	calendarID string,
	sinceLocal, untilLocal time.Time,
	loc *time.Location,
) ([]*calendar.Event, bool, error) {
	// 先檢查是否已連
	connected, err := s.gcalSvc.IsConnected(ctx)
	if err != nil {
		return nil, false, err
	}
	if !connected {
		return nil, false, nil
	}

	// 換算成 UTC 絕對時間戳（startUTC, endUTC)
	startUTC := sinceLocal.UTC()
	endUTC := untilLocal.AddDate(0, 0, 1).UTC() // exclusive

	// cache lookup
	cacheKey := gcalCacheKey(calendarID, startUTC, endUTC)
	if s.cacheEnabled {
		s.cacheMu.Lock()
		if entry, ok := s.cache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
			s.cacheMu.Unlock()
			return entry.events, true, nil
		}
		s.cacheMu.Unlock()
	}

	events, err := s.gcalSvc.ListEvents(ctx, calendarID, startUTC, endUTC, true)
	if err != nil {
		// 若是 AppError(GCAL_NOT_CONNECTED)（例如 token 過期後 Integration 被清），視為 not connected
		if appErr, ok := err.(*model.AppError); ok {
			if appErr.Code == model.ErrCodeGcalNotConnected {
				return nil, false, nil
			}
			// token expired 也視為 degraded（不讓 API 整個掛）
			if appErr.Code == model.ErrCodeGcalTokenExpired {
				return nil, true, err
			}
		}
		return nil, true, err
	}

	if s.cacheEnabled {
		s.cacheMu.Lock()
		s.cache[cacheKey] = &gcalCacheEntry{
			events:    events,
			expiresAt: time.Now().Add(gcalCacheTTL),
		}
		s.cacheMu.Unlock()
	}
	return events, true, nil
}

// gcalCacheKey 產生 cache key
func gcalCacheKey(calendarID string, startUTC, endUTC time.Time) string {
	raw := fmt.Sprintf("%s|%d|%d", calendarID, startUTC.Unix(), endUTC.Unix())
	sum := sha1.Sum([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// buildDayBuckets 依時區建立 since..until 每一天的 CalendarDay map（key=YYYY-MM-DD）
//
// 初始化 Entries / Events 為空 slice（避免 json null）。
func buildDayBuckets(sinceLocal, untilLocal time.Time, loc *time.Location) map[string]*dto.CalendarDay {
	m := make(map[string]*dto.CalendarDay)
	for d := sinceLocal; !d.After(untilLocal); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		m[key] = &dto.CalendarDay{
			Date:    key,
			Entries: []dto.CalendarEntrySummary{},
			Events:  []dto.CalendarEventSummary{},
		}
	}
	_ = loc
	return m
}

// orderedDates 回傳 since..until 之間的日期字串陣列（依時間遞增）
func orderedDates(sinceLocal, untilLocal time.Time, loc *time.Location) []string {
	out := make([]string, 0)
	for d := sinceLocal; !d.After(untilLocal); d = d.AddDate(0, 0, 1) {
		out = append(out, d.Format("2006-01-02"))
	}
	_ = loc
	return out
}

// convertGcalEvent 將 Google Calendar event 轉為 DTO
//
// 時間解析規則：
//   - event.Start.DateTime 存在 → 以 RFC3339 解析（含時區）
//   - 否則 event.Start.Date（all-day）→ 以當地時區 00:00
//   - 若無 End，end = start
//
// 回傳 nil 代表 event 無效（例如 summary 為空且無時間）。
func convertGcalEvent(ev *calendar.Event, loc *time.Location) *dto.CalendarEventSummary {
	if ev == nil {
		return nil
	}

	allDay := false
	var start, end time.Time
	var err error

	switch {
	case ev.Start != nil && ev.Start.DateTime != "":
		start, err = time.Parse(time.RFC3339, ev.Start.DateTime)
		if err != nil {
			return nil
		}
	case ev.Start != nil && ev.Start.Date != "":
		start, err = time.ParseInLocation("2006-01-02", ev.Start.Date, loc)
		if err != nil {
			return nil
		}
		allDay = true
	default:
		return nil
	}

	switch {
	case ev.End != nil && ev.End.DateTime != "":
		end, err = time.Parse(time.RFC3339, ev.End.DateTime)
		if err != nil {
			end = start
		}
	case ev.End != nil && ev.End.Date != "":
		end, err = time.ParseInLocation("2006-01-02", ev.End.Date, loc)
		if err != nil {
			end = start
		}
	default:
		end = start
	}

	var location, description *string
	if ev.Location != "" {
		l := ev.Location
		location = &l
	}
	if ev.Description != "" {
		d := ev.Description
		description = &d
	}

	return &dto.CalendarEventSummary{
		GcalID:      ev.Id,
		Summary:     ev.Summary,
		Start:       start,
		End:         end,
		AllDay:      allDay,
		Location:    location,
		Description: description,
		// LinkedEntryID：F-026c 會填入；此處暫時 nil
	}
}

// assignEventToDays 把 event 放入正確的 day bucket
//
// 規則（依 spec §Business Rules #3）：
//   - month view：event 僅歸屬到 start 所在日
//   - week / day view：只要 event 的 [start, end] 跟某一天有交集就加入該天
//     （client-side 可再做去重；server 端允許重複）
func assignEventToDays(
	days map[string]*dto.CalendarDay,
	ev *dto.CalendarEventSummary,
	view string,
	loc *time.Location,
) {
	if view == "month" {
		key := ev.Start.In(loc).Format("2006-01-02")
		if b, ok := days[key]; ok {
			b.Events = append(b.Events, *ev)
		}
		return
	}

	// week / day：逐日檢查是否與 event 區間有交集
	for k, b := range days {
		dayStart, err := time.ParseInLocation("2006-01-02", k, loc)
		if err != nil {
			continue
		}
		dayEnd := dayStart.AddDate(0, 0, 1).Add(-time.Nanosecond)

		// 交集條件：event.Start <= dayEnd && event.End >= dayStart
		if !ev.Start.After(dayEnd) && !ev.End.Before(dayStart) {
			b.Events = append(b.Events, *ev)
		}
	}
}
