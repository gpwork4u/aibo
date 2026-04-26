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

// GcalStatusResponse Google Calendar 連線狀態回應（F-030b）
//
// 未連線時 `Connected=false`，其餘欄位省略（json omitempty）。
// 已連線時補齊 email / connected_at / access_token_expires_at / default_calendar_id。
type GcalStatusResponse struct {
	Connected            bool    `json:"connected"`
	Email                string  `json:"email,omitempty"`
	ConnectedAt          *string `json:"connected_at,omitempty"`
	AccessTokenExpiresAt *string `json:"access_token_expires_at,omitempty"`
	DefaultCalendarID    string  `json:"default_calendar_id,omitempty"`
}

// GcalCalendar 單一可選 Google Calendar 條目（F-030b）
type GcalCalendar struct {
	ID       string `json:"id"`
	Summary  string `json:"summary"`
	Primary  bool   `json:"primary"`
	TimeZone string `json:"time_zone"`
}

// GcalCalendarsResponse 列出可選日曆回應（F-030b）
type GcalCalendarsResponse struct {
	Calendars []*GcalCalendar `json:"calendars"`
}

// GcalUpdateSettingsRequest 更新預設日曆設定（F-030b）
//
// `default_calendar_id` 必填，空字串會被視為 invalid input；若呼叫端要回到預設行為，
// 應該傳 `"primary"`。
type GcalUpdateSettingsRequest struct {
	DefaultCalendarID string `json:"default_calendar_id"`
}
