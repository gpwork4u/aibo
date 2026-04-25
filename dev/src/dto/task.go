package dto

import (
	"time"

	"github.com/google/uuid"
)

// TaskRefDTO task 的關聯目標（雙向使用：request 與 response）
//
// 在 response 端，service 層會把 Exists（目標是否仍存在於系統內）填上以方便前端標記。
// 在 request 端，Exists 永遠忽略。
type TaskRefDTO struct {
	RefType string `json:"ref_type" binding:"required,oneof=entry journal gcal_event"`
	RefID   string `json:"ref_id"   binding:"required"`
	Exists  *bool  `json:"exists,omitempty"`
}

// CreateTaskRequest POST /api/v1/projects/:project_id/tasks 的請求 body
type CreateTaskRequest struct {
	Title       string       `json:"title"       binding:"required,min=1,max=200"`
	Description *string      `json:"description" binding:"omitempty,max=5000"`
	Status      *string      `json:"status"      binding:"omitempty,oneof=todo in_progress blocked done cancelled"`
	Priority    *string      `json:"priority"    binding:"omitempty,oneof=low normal high urgent"`
	DueDate     *string      `json:"due_date"` // YYYY-MM-DD
	Position    *int         `json:"position"`
	Refs        []TaskRefDTO `json:"refs"`
}

// UpdateTaskRequest PATCH /api/v1/tasks/:id 的 partial update body
//
// Refs 為 nil 代表不更動；非 nil（含長度 0）代表「整批覆寫」。
type UpdateTaskRequest struct {
	Title       *string       `json:"title"       binding:"omitempty,min=1,max=200"`
	Description **string      `json:"description" binding:"omitempty"`
	Status      *string       `json:"status"      binding:"omitempty,oneof=todo in_progress blocked done cancelled"`
	Priority    *string       `json:"priority"    binding:"omitempty,oneof=low normal high urgent"`
	DueDate     **string      `json:"due_date"`
	Position    *int          `json:"position"`
	Refs        *[]TaskRefDTO `json:"refs"`
}

// TaskResponse Task 的 API 回應（含 refs）
type TaskResponse struct {
	ID          uuid.UUID    `json:"id"`
	ProjectID   uuid.UUID    `json:"project_id"`
	Title       string       `json:"title"`
	Description *string      `json:"description"`
	Status      string       `json:"status"`
	Priority    string       `json:"priority"`
	DueDate     *string      `json:"due_date"`
	Position    int          `json:"position"`
	Refs        []TaskRefDTO `json:"refs"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	CompletedAt *time.Time   `json:"completed_at"`
}

// ListTasksResponse GET /api/v1/projects/:project_id/tasks 的回應（無分頁）
type ListTasksResponse struct {
	Data []TaskResponse `json:"data"`
}

// UpcomingTaskItem upcoming/overdue 列表項目（額外帶 project 名稱方便前端展示）
type UpcomingTaskItem struct {
	ID          uuid.UUID  `json:"id"`
	ProjectID   uuid.UUID  `json:"project_id"`
	ProjectName string     `json:"project_name"`
	Title       string     `json:"title"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	DueDate     *string    `json:"due_date"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at"`
}

// UpcomingTasksResponse GET /api/v1/tasks/upcoming?days=N 的回應
type UpcomingTasksResponse struct {
	Data []UpcomingTaskItem `json:"data"`
}
