package model

import (
	"time"

	"github.com/google/uuid"
)

// ProjectStatus 專案狀態 enum 值（對應 migration 015 的 chk projects.status）
const (
	ProjectStatusActive   = "active"
	ProjectStatusPaused   = "paused"
	ProjectStatusDone     = "done"
	ProjectStatusArchived = "archived"
)

// IsValidProjectStatus 驗證 status 字串是否合法
func IsValidProjectStatus(s string) bool {
	switch s {
	case ProjectStatusActive, ProjectStatusPaused, ProjectStatusDone, ProjectStatusArchived:
		return true
	}
	return false
}

// Project 對應 projects 資料表
//
// Date 欄位採 *time.Time（NULLABLE），呼叫端輸出 JSON 時請格式化為 YYYY-MM-DD
// 以避免 timezone 誤導（與 Journal.Date 慣例一致）。
type Project struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Color       string     `json:"color"`
	Status      string     `json:"status"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	Progress    int        `json:"progress"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
