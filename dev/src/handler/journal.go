package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

// JournalHandler 每日日記 HTTP handlers（F-028b）
type JournalHandler struct {
	svc *service.JournalService
}

// NewJournalHandler 建立 JournalHandler
func NewJournalHandler(svc *service.JournalService) *JournalHandler {
	return &JournalHandler{svc: svc}
}

// formatDate 將 model.Journal.Date 轉成 YYYY-MM-DD 字串
func formatJournalDate(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

// toJournalResponse 將 model + refs 組成 dto.JournalResponse
func toJournalResponse(j *model.Journal, refs []model.JournalSourceRef) dto.JournalResponse {
	highlights := j.Highlights
	if highlights == nil {
		highlights = []string{}
	}
	out := dto.JournalResponse{
		ID:            j.ID,
		Date:          formatJournalDate(j.Date),
		Title:         j.Title,
		Content:       j.Content,
		Mood:          j.Mood,
		Highlights:    highlights,
		IsDraft:       j.IsDraft,
		GeneratedBy:   j.GeneratedBy,
		LlmProviderID: j.LlmProviderID,
		SourceRefs:    make([]dto.SourceRefDTO, 0, len(refs)),
		CreatedAt:     j.CreatedAt,
		UpdatedAt:     j.UpdatedAt,
	}
	for _, r := range refs {
		out.SourceRefs = append(out.SourceRefs, dto.SourceRefDTO{
			SourceType: r.SourceType,
			SourceID:   r.SourceID,
		})
	}
	return out
}

// toJournalListItem 將 model 轉成列表項目
func toJournalListItem(j *model.Journal) dto.JournalListItem {
	return dto.JournalListItem{
		ID:          j.ID,
		Date:        formatJournalDate(j.Date),
		Title:       j.Title,
		Mood:        j.Mood,
		IsDraft:     j.IsDraft,
		GeneratedBy: j.GeneratedBy,
		CreatedAt:   j.CreatedAt,
		UpdatedAt:   j.UpdatedAt,
	}
}

// writeJournalError 統一輸出 AppError
func writeJournalError(c *gin.Context, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}

// Create POST /api/v1/journal
func (h *JournalHandler) Create(c *gin.Context) {
	var req dto.CreateJournalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: err.Error(),
		})
		return
	}

	tz := c.GetHeader("X-Timezone")
	j, refs, err := h.svc.Create(c.Request.Context(), &req, tz)
	if err != nil {
		writeJournalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toJournalResponse(j, refs))
}

// GetByDate GET /api/v1/journal/:date
func (h *JournalHandler) GetByDate(c *gin.Context) {
	date := c.Param("date")
	tz := c.GetHeader("X-Timezone")

	j, refs, err := h.svc.GetByDate(c.Request.Context(), date, tz)
	if err != nil {
		writeJournalError(c, err)
		return
	}
	c.JSON(http.StatusOK, toJournalResponse(j, refs))
}

// Update PATCH /api/v1/journal/:date
func (h *JournalHandler) Update(c *gin.Context) {
	date := c.Param("date")
	tz := c.GetHeader("X-Timezone")

	var req dto.UpdateJournalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: err.Error(),
		})
		return
	}

	j, refs, err := h.svc.Update(c.Request.Context(), date, tz, &req)
	if err != nil {
		writeJournalError(c, err)
		return
	}
	c.JSON(http.StatusOK, toJournalResponse(j, refs))
}

// Delete DELETE /api/v1/journal/:date
func (h *JournalHandler) Delete(c *gin.Context) {
	date := c.Param("date")
	tz := c.GetHeader("X-Timezone")

	if err := h.svc.Delete(c.Request.Context(), date, tz); err != nil {
		writeJournalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// List GET /api/v1/journal?page=&per_page=&since=&until=&mood=&is_draft=
func (h *JournalHandler) List(c *gin.Context) {
	tz := c.GetHeader("X-Timezone")
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "無效的時區",
		})
		return
	}

	opts := repository.JournalListOptions{
		Page:    1,
		PerPage: 20,
	}

	if v := c.Query("page"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "page 必須為正整數",
			})
			return
		}
		opts.Page = n
	}
	if v := c.Query("per_page"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 200 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "per_page 必須為 1~200 的整數",
			})
			return
		}
		opts.PerPage = n
	}
	if v := c.Query("since"); v != "" {
		t, err := time.ParseInLocation("2006-01-02", v, loc)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "無效的 since 日期格式，需 YYYY-MM-DD",
			})
			return
		}
		ut := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		opts.Since = &ut
	}
	if v := c.Query("until"); v != "" {
		t, err := time.ParseInLocation("2006-01-02", v, loc)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "無效的 until 日期格式，需 YYYY-MM-DD",
			})
			return
		}
		ut := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		opts.Until = &ut
	}
	if v := c.Query("mood"); v != "" {
		switch v {
		case model.MoodGreat, model.MoodOk, model.MoodDown:
			m := v
			opts.Mood = &m
		default:
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "mood 必須為 great / ok / down",
			})
			return
		}
	}
	if v := c.Query("is_draft"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "is_draft 必須為 bool",
			})
			return
		}
		opts.IsDraft = &parsed
	}

	items, total, err := h.svc.List(c.Request.Context(), opts)
	if err != nil {
		writeJournalError(c, err)
		return
	}

	data := make([]dto.JournalListItem, 0, len(items))
	for _, j := range items {
		data = append(data, toJournalListItem(j))
	}

	totalPages := 0
	if opts.PerPage > 0 {
		totalPages = int((total + int64(opts.PerPage) - 1) / int64(opts.PerPage))
	}

	c.JSON(http.StatusOK, dto.ListJournalResponse{
		Data: data,
		Pagination: dto.PaginationResponse{
			Page:       opts.Page,
			PerPage:    opts.PerPage,
			Total:      int(total),
			TotalPages: totalPages,
		},
	})
}
