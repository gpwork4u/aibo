package handler

// CopilotStreamHandler F-039 SSE skeleton（已被 F-048 CopilotHandler 取代）
// 保留此檔案以避免破壞任何現有 import；實際路由請使用 CopilotHandler。
//
// Deprecated: 請改用 NewCopilotHandler + CopilotHandler.Stream。
type CopilotStreamHandler struct{}

// NewCopilotStreamHandler 建立 CopilotStreamHandler（deprecated skeleton）
func NewCopilotStreamHandler() *CopilotStreamHandler {
	return &CopilotStreamHandler{}
}
