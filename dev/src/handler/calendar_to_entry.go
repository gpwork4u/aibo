package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// CalendarConvertHandler 負責 POST /api/v1/calendar/events/:gcal_id/to-entry（F-026c）。
//
// 為避免與 F-026b 的 CalendarHandler.List/GetDay 衝突，轉換流程單獨放在此 handler。
type CalendarConvertHandler struct {
	svc *service.CalendarConvertService
}

// NewCalendarConvertHandler 建立 handler。
func NewCalendarConvertHandler(svc *service.CalendarConvertService) *CalendarConvertHandler {
	return &CalendarConvertHandler{svc: svc}
}

// ConvertToEntry POST /api/v1/calendar/events/:gcal_id/to-entry
//
// 將指定的 Google Calendar event 轉成 entry。
//
// 錯誤回應（對應 spec F-026 §API Contract）：
//   - 400 INVALID_INPUT：gcal_id 為空
//   - 404 EVENT_NOT_FOUND：Google Calendar 查不到該 event
//   - 409 ALREADY_LINKED：該 gcal_id 已有對應 entry
//   - 424 GCAL_NOT_CONNECTED：使用者尚未完成 OAuth
//   - 502 GCAL_UPSTREAM_ERROR：Google API 非 404 錯誤
func (h *CalendarConvertHandler) ConvertToEntry(c *gin.Context) {
	gcalID := c.Param("gcal_id")
	if gcalID == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "gcal_id 為必填",
		})
		return
	}

	// body 完全選填：若解析失敗（如 empty body）視為空值，不報錯
	var req dto.ToEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = dto.ToEntryRequest{}
	}

	calendarID := ""
	if req.CalendarID != nil {
		calendarID = *req.CalendarID
	}

	entry, err := h.svc.ConvertEventToEntry(
		c.Request.Context(),
		gcalID,
		calendarID,
		req.TitleOverride,
		req.ContentOverride,
	)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "伺服器內部錯誤",
		})
		return
	}

	c.JSON(http.StatusCreated, entry)
}
