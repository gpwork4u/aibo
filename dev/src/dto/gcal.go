package dto

// GcalAuthResponse OAuth 授權回應
type GcalAuthResponse struct {
	AuthURL string `json:"auth_url"`
}

// GcalCallbackResponse OAuth callback 成功回應
type GcalCallbackResponse struct {
	Message string `json:"message"`
	Email   string `json:"email"`
}

// GcalImportRequest 匯入 Google Calendar 事件請求
type GcalImportRequest struct {
	CalendarID       *string `json:"calendar_id"`
	Since            *string `json:"since"`
	Until            *string `json:"until"`
	IncludeRecurring *bool   `json:"include_recurring"`
}

// GcalImportResponse 匯入結果回應
type GcalImportResponse struct {
	EventsFound    int `json:"events_found"`
	EntriesCreated int `json:"entries_created"`
	EntriesSkipped int `json:"entries_skipped"`
}
