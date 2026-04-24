package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	gcal "google.golang.org/api/calendar/v3"
)

// GcalEventFetcher 定義「取得單一 gcal event」的依賴，方便測試替換。
//
// 生產環境由 *GcalService.GetEvent 實作；測試則可提供 mock。
type GcalEventFetcher interface {
	GetEvent(ctx context.Context, calendarID, eventID string) (*gcal.Event, error)
}

// CalendarConvertService 負責把 Google Calendar event 轉換成 entry（F-026c）。
//
// 流程：
//  1. 透過 GcalEventFetcher 取得 event（錯誤已由 fetcher 映射成 AppError）
//  2. 組裝 entry（title、content、tags、source 等）
//  3. 呼叫 EntryRepository.Create；依賴 DB 上的 uq_entries_gcal_ref partial unique index
//     保證原子去重（Create 遇重複時會回 ALREADY_LINKED 409）
//
// 不做「先 SELECT 再 INSERT」的 race-prone 檢查。
type CalendarConvertService struct {
	fetcher   GcalEventFetcher
	entryRepo EntryRepository
}

// NewCalendarConvertService 建立 CalendarConvertService。
func NewCalendarConvertService(fetcher GcalEventFetcher, entryRepo EntryRepository) *CalendarConvertService {
	return &CalendarConvertService{fetcher: fetcher, entryRepo: entryRepo}
}

// ConvertEventToEntry 把指定 gcal event 轉成 entry 並回傳。
//
// 參數：
//   - gcalID：Google Calendar event id（必填）
//   - calendarID：預設 "primary"
//   - titleOverride / contentOverride：optional，若提供則覆寫預設值
//
// 錯誤：
//   - 404 EVENT_NOT_FOUND：Google API 查無該 event
//   - 409 ALREADY_LINKED：該 gcal_id 已有對應 entry（由 uq_entries_gcal_ref 保證）
//   - 424 GCAL_NOT_CONNECTED：使用者尚未完成 OAuth
//   - 502 GCAL_UPSTREAM_ERROR：Google API 非 404 錯誤
func (s *CalendarConvertService) ConvertEventToEntry(
	ctx context.Context,
	gcalID, calendarID string,
	titleOverride, contentOverride *string,
) (*model.Entry, error) {
	if gcalID == "" {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "gcal_id 為必填")
	}
	if calendarID == "" {
		calendarID = "primary"
	}

	event, err := s.fetcher.GetEvent(ctx, calendarID, gcalID)
	if err != nil {
		return nil, err
	}
	if event == nil {
		return nil, model.NewAppError(404, model.ErrCodeEventNotFound, "Google Calendar 找不到該 event")
	}

	// 組裝 title
	title := buildEventTitle(event)
	if titleOverride != nil && *titleOverride != "" {
		title = *titleOverride
	}

	// 組裝 content
	content := buildEventContent(event)
	if contentOverride != nil && *contentOverride != "" {
		content = *contentOverride
	}

	sourceType := "gcal"
	sourceRef := event.Id
	source := calendarID
	tags := []string{"gcal", "meeting"}

	now := time.Now()
	entry := &model.Entry{
		ID:         uuid.New(),
		Title:      &title,
		Content:    &content,
		Source:     &source,
		SourceType: &sourceType,
		SourceRef:  &sourceRef,
		Tags:       tags,
		IsArchived: false,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := s.entryRepo.Create(ctx, entry); err != nil {
		return nil, err
	}

	return entry, nil
}

// buildEventTitle 依慣例產生 entry 標題。
//
// 沿用 ImportEvents 的 "[GCal] " + summary 格式；若 event 無 summary 則以 id 代稱。
func buildEventTitle(event *gcal.Event) string {
	if event == nil || event.Summary == "" {
		return fmt.Sprintf("[GCal] %s", eventIDOrUntitled(event))
	}
	return "[GCal] " + event.Summary
}

func eventIDOrUntitled(event *gcal.Event) string {
	if event == nil || event.Id == "" {
		return "(未命名事件)"
	}
	return event.Id
}
