package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// TaskHandler 任務 HTTP handlers（F-031c）
type TaskHandler struct {
	svc            *service.TaskService
	projectService *service.ProjectService // 用來查 project name 給 upcoming/overdue
}

// NewTaskHandler 建立 TaskHandler
func NewTaskHandler(svc *service.TaskService, projectSvc *service.ProjectService) *TaskHandler {
	return &TaskHandler{svc: svc, projectService: projectSvc}
}

// formatTaskDate 將 *time.Time 轉成 *string YYYY-MM-DD
func formatTaskDate(t *model.Task) *string {
	if t.DueDate == nil {
		return nil
	}
	s := t.DueDate.UTC().Format("2006-01-02")
	return &s
}

// toTaskResponse 將 model + refs 組成 dto.TaskResponse
func toTaskResponse(t *model.Task, refs []model.TaskRef) dto.TaskResponse {
	refsDTO := make([]dto.TaskRefDTO, 0, len(refs))
	for _, r := range refs {
		refsDTO = append(refsDTO, dto.TaskRefDTO{
			RefType: r.RefType,
			RefID:   r.RefID,
		})
	}
	return dto.TaskResponse{
		ID:          t.ID,
		ProjectID:   t.ProjectID,
		Title:       t.Title,
		Description: t.Description,
		Status:      t.Status,
		Priority:    t.Priority,
		DueDate:     formatTaskDate(t),
		Position:    t.Position,
		Refs:        refsDTO,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
		CompletedAt: t.CompletedAt,
	}
}

// writeTaskError 統一輸出 AppError
func writeTaskError(c *gin.Context, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}

// parseTaskUUIDParam 從 :id / :project_id 取出 uuid.UUID
func parseTaskUUIDParam(c *gin.Context, key string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(key))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: key + " 必須為合法的 UUID",
		})
		return uuid.Nil, false
	}
	return id, true
}

// CreateInProject POST /api/v1/projects/:id/tasks
func (h *TaskHandler) CreateInProject(c *gin.Context) {
	projectID, ok := parseTaskUUIDParam(c, "id")
	if !ok {
		return
	}
	var req dto.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: err.Error(),
		})
		return
	}
	t, refs, err := h.svc.Create(c.Request.Context(), projectID, &req)
	if err != nil {
		writeTaskError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toTaskResponse(t, refs))
}

// ListByProject GET /api/v1/projects/:id/tasks?status=todo,in_progress
func (h *TaskHandler) ListByProject(c *gin.Context) {
	projectID, ok := parseTaskUUIDParam(c, "id")
	if !ok {
		return
	}
	var statusFilter []string
	if v := c.Query("status"); v != "" {
		raw := strings.Split(v, ",")
		for _, s := range raw {
			s = strings.TrimSpace(s)
			if s == "" {
				continue
			}
			if !model.IsValidTaskStatus(s) {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "status 必須為 todo / in_progress / blocked / done / cancelled",
				})
				return
			}
			statusFilter = append(statusFilter, s)
		}
	}

	items, err := h.svc.ListByProject(c.Request.Context(), projectID, statusFilter)
	if err != nil {
		writeTaskError(c, err)
		return
	}

	data := make([]dto.TaskResponse, 0, len(items))
	for _, t := range items {
		// 列表不展開 refs（避免 N+1）
		data = append(data, toTaskResponse(t, nil))
	}
	c.JSON(http.StatusOK, dto.ListTasksResponse{Data: data})
}

// GetByID GET /api/v1/tasks/:id
func (h *TaskHandler) GetByID(c *gin.Context) {
	id, ok := parseTaskUUIDParam(c, "id")
	if !ok {
		return
	}
	t, refs, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		writeTaskError(c, err)
		return
	}
	c.JSON(http.StatusOK, toTaskResponse(t, refs))
}

// Update PATCH /api/v1/tasks/:id
func (h *TaskHandler) Update(c *gin.Context) {
	id, ok := parseTaskUUIDParam(c, "id")
	if !ok {
		return
	}
	var req dto.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: err.Error(),
		})
		return
	}
	t, refs, err := h.svc.Update(c.Request.Context(), id, &req)
	if err != nil {
		writeTaskError(c, err)
		return
	}
	c.JSON(http.StatusOK, toTaskResponse(t, refs))
}

// Complete POST /api/v1/tasks/:id/complete
func (h *TaskHandler) Complete(c *gin.Context) {
	id, ok := parseTaskUUIDParam(c, "id")
	if !ok {
		return
	}
	t, err := h.svc.Complete(c.Request.Context(), id)
	if err != nil {
		writeTaskError(c, err)
		return
	}
	// 重新撈 refs 一致回傳
	_, refs, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		writeTaskError(c, err)
		return
	}
	c.JSON(http.StatusOK, toTaskResponse(t, refs))
}

// Delete DELETE /api/v1/tasks/:id
func (h *TaskHandler) Delete(c *gin.Context) {
	id, ok := parseTaskUUIDParam(c, "id")
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		writeTaskError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// Upcoming GET /api/v1/tasks/upcoming?days=7
func (h *TaskHandler) Upcoming(c *gin.Context) {
	days := 7
	if v := c.Query("days"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "days 必須為整數",
			})
			return
		}
		days = n
	}
	items, err := h.svc.ListUpcoming(c.Request.Context(), days)
	if err != nil {
		writeTaskError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.UpcomingTasksResponse{
		Data: h.toUpcomingItems(c, items),
	})
}

// Overdue GET /api/v1/tasks/overdue
func (h *TaskHandler) Overdue(c *gin.Context) {
	items, err := h.svc.ListOverdue(c.Request.Context())
	if err != nil {
		writeTaskError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.UpcomingTasksResponse{
		Data: h.toUpcomingItems(c, items),
	})
}

// toUpcomingItems 為 upcoming/overdue 補 project_name（小數量；naive cache）
func (h *TaskHandler) toUpcomingItems(c *gin.Context, items []*model.Task) []dto.UpcomingTaskItem {
	out := make([]dto.UpcomingTaskItem, 0, len(items))
	cache := map[uuid.UUID]string{}
	for _, t := range items {
		name, ok := cache[t.ProjectID]
		if !ok {
			if h.projectService != nil {
				if p, _, err := h.projectService.Get(c.Request.Context(), t.ProjectID); err == nil && p != nil {
					name = p.Name
				}
			}
			cache[t.ProjectID] = name
		}
		out = append(out, dto.UpcomingTaskItem{
			ID:          t.ID,
			ProjectID:   t.ProjectID,
			ProjectName: name,
			Title:       t.Title,
			Status:      t.Status,
			Priority:    t.Priority,
			DueDate:     formatTaskDate(t),
			UpdatedAt:   t.UpdatedAt,
			CompletedAt: t.CompletedAt,
		})
	}
	return out
}
