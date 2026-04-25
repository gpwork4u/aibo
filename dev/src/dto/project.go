package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateProjectRequest POST /api/v1/projects 的請求 body
type CreateProjectRequest struct {
	Name        string  `json:"name"        binding:"required,min=1,max=80"`
	Description *string `json:"description" binding:"omitempty,max=5000"`
	Color       *string `json:"color"       binding:"omitempty,max=20"`
	Status      *string `json:"status"      binding:"omitempty,oneof=active paused done archived"`
	StartDate   *string `json:"start_date"` // YYYY-MM-DD
	EndDate     *string `json:"end_date"`   // YYYY-MM-DD
}

// UpdateProjectRequest PATCH /api/v1/projects/:id 的 partial update body
//
// 所有欄位皆 optional：nil 代表不更動。
//   - Description / Color / StartDate / EndDate 用 **string 區分「不更動」(nil)
//     與「更新為 NULL」(*X == nil)；service 層解析時請小心
type UpdateProjectRequest struct {
	Name        *string  `json:"name"        binding:"omitempty,min=1,max=80"`
	Description **string `json:"description"`
	Color       *string  `json:"color"`
	Status      *string  `json:"status"      binding:"omitempty,oneof=active paused done archived"`
	StartDate   **string `json:"start_date"`
	EndDate     **string `json:"end_date"`
}

// TaskCountsResponse Project 詳情中的 task 數量摘要
type TaskCountsResponse struct {
	Total    int            `json:"total"`
	ByStatus map[string]int `json:"by_status"`
}

// ProjectResponse Project 的 API 回應（含 task_counts）
type ProjectResponse struct {
	ID          uuid.UUID           `json:"id"`
	Name        string              `json:"name"`
	Description *string             `json:"description"`
	Color       string              `json:"color"`
	Status      string              `json:"status"`
	StartDate   *string             `json:"start_date"`
	EndDate     *string             `json:"end_date"`
	Progress    int                 `json:"progress"`
	TaskCounts  *TaskCountsResponse `json:"task_counts,omitempty"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

// ProjectListItem 列表中的精簡項目（無 task_counts，避免 N+1）
type ProjectListItem struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	Status    string    `json:"status"`
	StartDate *string   `json:"start_date"`
	EndDate   *string   `json:"end_date"`
	Progress  int       `json:"progress"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ListProjectsResponse GET /api/v1/projects 的回應
type ListProjectsResponse struct {
	Data       []ProjectListItem  `json:"data"`
	Pagination PaginationResponse `json:"pagination"`
}
