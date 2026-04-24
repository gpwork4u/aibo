package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// CalendarHandler 行事曆彙整 HTTP handlers（F-026b）
type CalendarHandler struct {
	svc *service.CalendarService
}

// NewCalendarHandler 建立新的 CalendarHandler
func NewCalendarHandler(svc *service.CalendarService) *CalendarHandler {
	return &CalendarHandler{svc: svc}
}

// Aggregate 行事曆區間彙整
// GET /api/v1/calendar?since=&until=&view=&include_gcal=&calendar_id=
// Headers: X-Timezone: IANA tz（預設 UTC）
func (h *CalendarHandler) Aggregate(c *gin.Context) {
	since := c.Query("since")
	until := c.Query("until")
	if since == "" || until == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "since 與 until 皆為必填（格式 YYYY-MM-DD）",
		})
		return
	}

	view := c.DefaultQuery("view", "month")
	switch view {
	case "month", "week", "day":
		// ok
	default:
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "view 只能是 month / week / day",
		})
		return
	}

	// include_gcal 分為三態：
	//   - 明確 true：要求一定要整合 gcal；未連 gcal → 424 GCAL_NOT_CONNECTED（對齊 spec）
	//   - 明確 false：完全跳過 gcal
	//   - 未指定（預設 true）：盡力整合，未連時走 degraded（200 + gcal_connected=false）
	includeGcal := true
	explicitIncludeGcal := false
	if v := c.Query("include_gcal"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "include_gcal 必須為 bool",
			})
			return
		}
		includeGcal = parsed
		explicitIncludeGcal = true
	}

	calendarID := c.DefaultQuery("calendar_id", "primary")
	tz := c.GetHeader("X-Timezone")

	result, err := h.svc.Aggregate(c.Request.Context(), service.AggregateRequest{
		SinceDate:   since,
		UntilDate:   until,
		View:        view,
		IncludeGcal: includeGcal,
		CalendarID:  calendarID,
		Timezone:    tz,
	})
	if err != nil {
		writeCalendarError(c, err)
		return
	}

	// 明確 include_gcal=true 但 gcal 未連 → 424（spec 要求）
	if explicitIncludeGcal && includeGcal && !result.GcalConnected {
		c.JSON(http.StatusFailedDependency, dto.ErrorResponse{
			Code:    model.ErrCodeGcalNotConnected,
			Message: "尚未連接 Google Calendar，無法整合事件。請先完成 OAuth 授權。",
		})
		return
	}

	// 其他 degraded 情境（gcal upstream 失敗，或未指定 include_gcal 時未連）→ 200 + X-Degraded: gcal
	if result.Degraded {
		c.Header("X-Degraded", "gcal")
	}

	c.JSON(http.StatusOK, result.Response)
}

// GetDay 取得單日彙整
// GET /api/v1/calendar/days/:date
// Headers: X-Timezone: IANA tz（預設 UTC）
func (h *CalendarHandler) GetDay(c *gin.Context) {
	date := c.Param("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "date 為必填（格式 YYYY-MM-DD）",
		})
		return
	}

	includeGcal := true
	if v := c.Query("include_gcal"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "include_gcal 必須為 bool",
			})
			return
		}
		includeGcal = parsed
	}
	calendarID := c.DefaultQuery("calendar_id", "primary")
	tz := c.GetHeader("X-Timezone")

	day, degraded, _, err := h.svc.GetDay(c.Request.Context(), date, tz, calendarID, includeGcal)
	if err != nil {
		writeCalendarError(c, err)
		return
	}
	if degraded {
		c.Header("X-Degraded", "gcal")
	}

	c.JSON(http.StatusOK, day)
}

// writeCalendarError 統一錯誤輸出
func writeCalendarError(c *gin.Context, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}
