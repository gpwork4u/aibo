package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// JournalDraftHandler F-028c：LLM 草稿 HTTP handler。
//
// 為避免與 F-028b 的 JournalHandler 互相干涉而拆獨立檔。
type JournalDraftHandler struct {
	svc *service.JournalDraftService
}

// NewJournalDraftHandler 建立 handler。
func NewJournalDraftHandler(svc *service.JournalDraftService) *JournalDraftHandler {
	return &JournalDraftHandler{svc: svc}
}

// JournalDraftResponse API 對外回應格式
type JournalDraftResponse struct {
	Date        string   `json:"date"`
	Draft       string   `json:"draft"`
	UsedRefs    []string `json:"used_refs,omitempty"`
	Mood        string   `json:"mood,omitempty"`
	GeneratedBy string   `json:"generated_by"`
	Warnings    []string `json:"warnings,omitempty"`
}

// Draft POST /api/v1/journal/:date/draft
//
// Headers：X-Timezone（可選）
// Query：calendar_id（可選，預設 primary）
//
// 回應：JournalDraftResponse
//
// 錯誤：
//   - 400 INVALID_INPUT
//   - 404 NOT_FOUND（當日無素材）
//   - 424 LLM_NOT_CONFIGURED
//   - 502 LLM_UPSTREAM_ERROR
//
// **Draft 不會寫進 DB**；前端拿 draft 後讓使用者編輯，再透過 PATCH /journal/:date 落地。
func (h *JournalDraftHandler) Draft(c *gin.Context) {
	date := c.Param("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "date 為必填（YYYY-MM-DD）",
		})
		return
	}
	tz := c.GetHeader("X-Timezone")
	calendarID := c.DefaultQuery("calendar_id", "primary")

	result, err := h.svc.Draft(c.Request.Context(), date, tz, calendarID)
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

	c.JSON(http.StatusOK, JournalDraftResponse{
		Date:        date,
		Draft:       result.Draft,
		UsedRefs:    result.UsedRefs,
		Mood:        result.Mood,
		GeneratedBy: result.GeneratedBy,
		Warnings:    result.Warnings,
	})
}
