package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
	"google.golang.org/api/calendar/v3"
)

// GcalHandler Google Calendar 整合 handler
type GcalHandler struct {
	gcalSvc *service.GcalService
}

// NewGcalHandler 建立新的 GcalHandler
func NewGcalHandler(gcalSvc *service.GcalService) *GcalHandler {
	return &GcalHandler{gcalSvc: gcalSvc}
}

// StartAuth 開始 OAuth 授權流程
// POST /api/v1/integrations/gcal/auth
func (h *GcalHandler) StartAuth(c *gin.Context) {
	authURL, err := h.gcalSvc.StartOAuth()
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "伺服器內部錯誤"})
		return
	}

	c.JSON(http.StatusOK, dto.GcalAuthResponse{AuthURL: authURL})
}

// Callback 處理 OAuth callback
// GET /api/v1/integrations/gcal/callback
func (h *GcalHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: model.ErrCodeInvalidInput, Message: "code 和 state 參數為必填"})
		return
	}

	email, err := h.gcalSvc.HandleCallback(c.Request.Context(), code, state)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "伺服器內部錯誤"})
		return
	}

	c.JSON(http.StatusOK, dto.GcalCallbackResponse{
		Message: "Google Calendar connected",
		Email:   email,
	})
}

// Import 匯入 Google Calendar 事件
// POST /api/v1/import/gcal
func (h *GcalHandler) Import(c *gin.Context) {
	var req dto.GcalImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 允許空 body（全部使用預設值）
		req = dto.GcalImportRequest{}
	}

	// 解析參數，設定預設值
	calendarID := "primary"
	if req.CalendarID != nil && *req.CalendarID != "" {
		calendarID = *req.CalendarID
	}

	now := time.Now().UTC()
	since := now.AddDate(0, 0, -7) // 預設 7 天前
	until := now.AddDate(0, 0, 7)  // 預設 7 天後

	if req.Since != nil && *req.Since != "" {
		parsed, err := time.Parse(time.RFC3339, *req.Since)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: model.ErrCodeInvalidInput, Message: "since 格式無效，須為 ISO 8601（例：2024-01-01T00:00:00Z）"})
			return
		}
		since = parsed
	}

	if req.Until != nil && *req.Until != "" {
		parsed, err := time.Parse(time.RFC3339, *req.Until)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: model.ErrCodeInvalidInput, Message: "until 格式無效，須為 ISO 8601（例：2024-01-31T23:59:59Z）"})
			return
		}
		until = parsed
	}

	includeRecurring := true
	if req.IncludeRecurring != nil {
		includeRecurring = *req.IncludeRecurring
	}

	eventsFound, entriesCreated, entriesSkipped, err := h.gcalSvc.ImportEvents(
		c.Request.Context(), calendarID, since, until, includeRecurring,
	)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "伺服器內部錯誤"})
		return
	}

	c.JSON(http.StatusOK, dto.GcalImportResponse{
		EventsFound:    eventsFound,
		EntriesCreated: entriesCreated,
		EntriesSkipped: entriesSkipped,
	})
}

// ListEventsExternal F-030c read-through events API
// GET /api/v1/integrations/gcal/events
//
// Query：
//   - since/until：ISO 8601；預設 -7d ~ +7d
//   - calendar_id：optional，預設 "primary"
//   - include_recurring：default true
//
// 回應：dto.ListGcalEventsResponse，含每筆 event 的 linked_entry_id
//
// 錯誤映射：
//   - 424 GCAL_NOT_CONNECTED — 未授權
//   - 401 GCAL_REAUTH_REQUIRED — refresh token 失效
//   - 401 GCAL_TOKEN_EXPIRED — refresh 暫時失敗（網路等）
//   - 502 GCAL_UPSTREAM_ERROR — Google API 錯誤
func (h *GcalHandler) ListEventsExternal(c *gin.Context) {
	now := time.Now().UTC()
	since := now.AddDate(0, 0, -7)
	until := now.AddDate(0, 0, 7)

	if v := c.Query("since"); v != "" {
		parsed, err := time.Parse(time.RFC3339, v)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: model.ErrCodeInvalidInput, Message: "since 格式無效，須為 ISO 8601"})
			return
		}
		since = parsed
	}
	if v := c.Query("until"); v != "" {
		parsed, err := time.Parse(time.RFC3339, v)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: model.ErrCodeInvalidInput, Message: "until 格式無效，須為 ISO 8601"})
			return
		}
		until = parsed
	}

	calendarID := c.Query("calendar_id")
	if calendarID == "" {
		calendarID = "primary"
	}

	includeRecurring := true
	if v := c.Query("include_recurring"); v == "false" {
		includeRecurring = false
	}

	items, err := h.gcalSvc.ListEventsWithLinks(c.Request.Context(), calendarID, since, until, includeRecurring)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "伺服器內部錯誤"})
		return
	}

	out := make([]dto.GcalEventResponse, 0, len(items))
	for _, item := range items {
		out = append(out, toGcalEventResponse(item.Event, item.LinkedEntryID))
	}
	c.JSON(http.StatusOK, dto.ListGcalEventsResponse{Events: out})
}

// toGcalEventResponse 把 *calendar.Event 轉成 API DTO。
func toGcalEventResponse(ev *calendar.Event, linkedEntryID uuid.UUID) dto.GcalEventResponse {
	resp := dto.GcalEventResponse{
		GcalID:      ev.Id,
		Summary:     ev.Summary,
		Description: ev.Description,
		Location:    ev.Location,
		HTMLLink:    ev.HtmlLink,
	}
	// start / end / all_day
	if ev.Start != nil {
		if ev.Start.DateTime != "" {
			resp.Start = ev.Start.DateTime
		} else if ev.Start.Date != "" {
			resp.Start = ev.Start.Date
			resp.AllDay = true
		}
	}
	if ev.End != nil {
		if ev.End.DateTime != "" {
			resp.End = ev.End.DateTime
		} else if ev.End.Date != "" {
			resp.End = ev.End.Date
		}
	}
	if ev.RecurringEventId != "" {
		v := ev.RecurringEventId
		resp.RecurringEventID = &v
	}
	if linkedEntryID != uuid.Nil {
		v := linkedEntryID.String()
		resp.LinkedEntryID = &v
	}
	return resp
}
