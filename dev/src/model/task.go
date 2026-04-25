package model

import (
	"time"

	"github.com/google/uuid"
)

// TaskStatus 任務狀態 enum 值（對應 migration 015 的 chk tasks.status）
const (
	TaskStatusTodo       = "todo"
	TaskStatusInProgress = "in_progress"
	TaskStatusBlocked    = "blocked"
	TaskStatusDone       = "done"
	TaskStatusCancelled  = "cancelled"
)

// TaskPriority 任務優先序 enum 值
const (
	TaskPriorityLow    = "low"
	TaskPriorityNormal = "normal"
	TaskPriorityHigh   = "high"
	TaskPriorityUrgent = "urgent"
)

// TaskRefType task_refs.ref_type 合法值
const (
	TaskRefTypeEntry     = "entry"
	TaskRefTypeJournal   = "journal"
	TaskRefTypeGcalEvent = "gcal_event"
)

// IsValidTaskStatus 驗證 status 字串是否合法
func IsValidTaskStatus(s string) bool {
	switch s {
	case TaskStatusTodo, TaskStatusInProgress, TaskStatusBlocked, TaskStatusDone, TaskStatusCancelled:
		return true
	}
	return false
}

// IsValidTaskPriority 驗證 priority 字串是否合法
func IsValidTaskPriority(s string) bool {
	switch s {
	case TaskPriorityLow, TaskPriorityNormal, TaskPriorityHigh, TaskPriorityUrgent:
		return true
	}
	return false
}

// IsValidTaskRefType 驗證 ref_type 字串是否合法
func IsValidTaskRefType(s string) bool {
	switch s {
	case TaskRefTypeEntry, TaskRefTypeJournal, TaskRefTypeGcalEvent:
		return true
	}
	return false
}

// Task 對應 tasks 資料表
type Task struct {
	ID          uuid.UUID  `json:"id"`
	ProjectID   uuid.UUID  `json:"project_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	Position    int        `json:"position"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at"`
}

// TaskRef 對應 task_refs 資料表（task 與 entry / journal / gcal_event 的關聯）
type TaskRef struct {
	TaskID  uuid.UUID `json:"-"`
	RefType string    `json:"ref_type"`
	RefID   string    `json:"ref_id"`
}
