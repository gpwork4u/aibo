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

// GcalEventResponse F-030c GET /events 單筆回應
type GcalEventResponse struct {
	GcalID           string  `json:"gcal_id"`
	Summary          string  `json:"summary"`
	Description      string  `json:"description"`
	Location         string  `json:"location"`
	Start            string  `json:"start"`
	End              string  `json:"end"`
	AllDay           bool    `json:"all_day"`
	RecurringEventID *string `json:"recurring_event_id"`
	HTMLLink         string  `json:"html_link"`
	LinkedEntryID    *string `json:"linked_entry_id"`
}

// ListGcalEventsResponse F-030c GET /events 回應包裝
type ListGcalEventsResponse struct {
	Events []GcalEventResponse `json:"events"`
}
