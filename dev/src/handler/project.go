package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

// ProjectHandler 專案 HTTP handlers（F-031b）
type ProjectHandler struct {
	svc *service.ProjectService
}

// NewProjectHandler 建立 ProjectHandler
func NewProjectHandler(svc *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{svc: svc}
}

// formatProjectDate 將 *time.Time 轉成 *string（YYYY-MM-DD），nil 對 nil
func formatProjectDate(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.UTC().Format("2006-01-02")
	return &s
}

// toProjectResponse 將 model + counts 組成 dto.ProjectResponse
func toProjectResponse(p *model.Project, counts *dto.TaskCountsResponse) dto.ProjectResponse {
	return dto.ProjectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Color:       p.Color,
		Status:      p.Status,
		StartDate:   formatProjectDate(p.StartDate),
		EndDate:     formatProjectDate(p.EndDate),
		Progress:    p.Progress,
		TaskCounts:  counts,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

// toProjectListItem 列表項目（無 task_counts 以避免 N+1）
func toProjectListItem(p *model.Project) dto.ProjectListItem {
	return dto.ProjectListItem{
		ID:        p.ID,
		Name:      p.Name,
		Color:     p.Color,
		Status:    p.Status,
		StartDate: formatProjectDate(p.StartDate),
		EndDate:   formatProjectDate(p.EndDate),
		Progress:  p.Progress,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}
}

// writeProjectError 統一輸出 AppError
func writeProjectError(c *gin.Context, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}

// parseProjectIDParam 從 URL :id 取出 uuid.UUID；錯誤回 400 INVALID_INPUT
func parseProjectIDParam(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "id 必須為合法的 UUID",
		})
		return uuid.Nil, false
	}
	return id, true
}

// Create POST /api/v1/projects
func (h *ProjectHandler) Create(c *gin.Context) {
	var req dto.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: err.Error(),
		})
		return
	}

	p, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		writeProjectError(c, err)
		return
	}
	// 新建立的專案 task_counts 必為 0
	counts := &dto.TaskCountsResponse{Total: 0, ByStatus: map[string]int{}}
	c.JSON(http.StatusCreated, toProjectResponse(p, counts))
}

// GetByID GET /api/v1/projects/:id
func (h *ProjectHandler) GetByID(c *gin.Context) {
	id, ok := parseProjectIDParam(c)
	if !ok {
		return
	}
	p, counts, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, toProjectResponse(p, counts))
}

// Update PATCH /api/v1/projects/:id
func (h *ProjectHandler) Update(c *gin.Context) {
	id, ok := parseProjectIDParam(c)
	if !ok {
		return
	}
	var req dto.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: err.Error(),
		})
		return
	}
	p, err := h.svc.Update(c.Request.Context(), id, &req)
	if err != nil {
		writeProjectError(c, err)
		return
	}
	// PATCH 後也帶 task_counts，與 GET 對齊
	_, counts, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, toProjectResponse(p, counts))
}

// Delete DELETE /api/v1/projects/:id[?force=true]
func (h *ProjectHandler) Delete(c *gin.Context) {
	id, ok := parseProjectIDParam(c)
	if !ok {
		return
	}
	force := false
	if v := c.Query("force"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "force 必須為 bool",
			})
			return
		}
		force = parsed
	}
	if err := h.svc.Delete(c.Request.Context(), id, force); err != nil {
		writeProjectError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// Archive POST /api/v1/projects/:id/archive
func (h *ProjectHandler) Archive(c *gin.Context) {
	id, ok := parseProjectIDParam(c)
	if !ok {
		return
	}
	p, err := h.svc.Archive(c.Request.Context(), id)
	if err != nil {
		writeProjectError(c, err)
		return
	}
	_, counts, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, toProjectResponse(p, counts))
}

// List GET /api/v1/projects?status=&page=&per_page=&sort=&order=
func (h *ProjectHandler) List(c *gin.Context) {
	opts := repository.ProjectListOptions{
		Page:    1,
		PerPage: 20,
	}

	// 預設 status=active；明確傳 "all" 則不過濾
	statusQ := c.Query("status")
	if statusQ == "" {
		s := model.ProjectStatusActive
		opts.Status = &s
	} else if strings.ToLower(statusQ) != "all" {
		if !model.IsValidProjectStatus(statusQ) {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "status 必須為 active / paused / done / archived / all",
			})
			return
		}
		s := statusQ
		opts.Status = &s
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
		if err != nil || n < 1 || n > 100 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "per_page 必須為 1~100 的整數",
			})
			return
		}
		opts.PerPage = n
	}
	if v := c.Query("sort"); v != "" {
		switch v {
		case "updated_at", "created_at", "name", "end_date", "start_date":
			opts.Sort = v
		default:
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "sort 必須為 updated_at / created_at / name / end_date / start_date",
			})
			return
		}
	}
	if v := c.Query("order"); v != "" {
		v = strings.ToLower(v)
		if v != "asc" && v != "desc" {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "order 必須為 asc / desc",
			})
			return
		}
		opts.Order = v
	}

	items, total, err := h.svc.List(c.Request.Context(), opts)
	if err != nil {
		writeProjectError(c, err)
		return
	}
	data := make([]dto.ProjectListItem, 0, len(items))
	for _, p := range items {
		data = append(data, toProjectListItem(p))
	}

	totalPages := 0
	if opts.PerPage > 0 {
		totalPages = int((total + int64(opts.PerPage) - 1) / int64(opts.PerPage))
	}

	c.JSON(http.StatusOK, dto.ListProjectsResponse{
		Data: data,
		Pagination: dto.PaginationResponse{
			Page:       opts.Page,
			PerPage:    opts.PerPage,
			Total:      int(total),
			TotalPages: totalPages,
		},
	})
}
