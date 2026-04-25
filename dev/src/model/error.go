package model

import "fmt"

// 錯誤碼常數
const (
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidInput      = "INVALID_INPUT"
	ErrCodeDuplicateKeyName  = "DUPLICATE_KEY_NAME"
	ErrCodeLastKeyProtected  = "LAST_KEY_PROTECTED"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeDuplicateCategory = "DUPLICATE_CATEGORY"
	ErrCodeDuplicateProvider = "DUPLICATE_PROVIDER"
	ErrCodeCategoryNotFound  = "CATEGORY_NOT_FOUND"
	ErrCodeDuplicateSource   = "DUPLICATE_SOURCE"
	ErrCodeGcalNotConnected  = "GCAL_NOT_CONNECTED"
	ErrCodeGcalTokenExpired  = "GCAL_TOKEN_EXPIRED"
	ErrCodeCalendarNotFound  = "CALENDAR_NOT_FOUND"
	ErrCodeCircularSupersede = "CIRCULAR_SUPERSEDE"
	ErrCodeAlreadyLinked     = "ALREADY_LINKED"
	ErrCodeEventNotFound     = "EVENT_NOT_FOUND"
	ErrCodeGcalUpstream      = "GCAL_UPSTREAM_ERROR"
	ErrCodeGcalReauthRequired = "GCAL_REAUTH_REQUIRED"

	// F-031 專案/任務 錯誤碼
	ErrCodeProjectNameDuplicate    = "PROJECT_NAME_DUPLICATE"
	ErrCodeProjectHasTasks         = "PROJECT_HAS_TASKS"
	ErrCodeTooManyTasks            = "TOO_MANY_TASKS"
	ErrCodeInvalidStatusTransition = "INVALID_STATUS_TRANSITION"
	ErrCodeProjectNotFound         = "PROJECT_NOT_FOUND"
	ErrCodeTaskNotFound            = "TASK_NOT_FOUND"
	ErrCodeProjectArchived         = "PROJECT_ARCHIVED"
	ErrCodeInvalidRefType          = "INVALID_REF_TYPE"
)

// AppError 應用程式錯誤
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// NewAppError 建立新的應用程式錯誤
func NewAppError(status int, code, message string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}
