package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateSessionResponse POST /api/v1/copilot/sessions 回應
type CreateSessionResponse struct {
	SessionID string    `json:"session_id"`
	CreatedAt time.Time `json:"created_at"`
}

// SendMessageRequest POST /api/v1/copilot/message 請求
type SendMessageRequest struct {
	SessionID uuid.UUID `json:"session_id" binding:"required"`
	Content   string    `json:"content"    binding:"required,min=1,max=4000"`
}

// SendMessageResponse POST /api/v1/copilot/message 回應
type SendMessageResponse struct {
	MsgID       string `json:"msg_id"`
	StreamReady bool   `json:"stream_ready"`
}

// CopilotMessageItem 歷史訊息單筆
type CopilotMessageItem struct {
	ID        uuid.UUID `json:"id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Seq       int       `json:"seq"`
	CreatedAt time.Time `json:"created_at"`
}

// ListMessagesResponse GET /api/v1/copilot/sessions/:id/messages 回應
type ListMessagesResponse struct {
	Messages []CopilotMessageItem `json:"messages"`
}

// SSE event data 結構
type SSEPingData struct {
	Ts    time.Time `json:"ts"`
	MsgID string    `json:"msg_id"`
	Seq   int       `json:"seq"`
}

type SSEMessageStartData struct {
	MsgID     string `json:"msg_id"`
	SessionID string `json:"session_id"`
}

type SSETokenData struct {
	Token string `json:"token"`
	MsgID string `json:"msg_id"`
	Seq   int    `json:"seq"`
}

type SSEMessageDoneData struct {
	MsgID        string `json:"msg_id"`
	TotalTokens  int    `json:"total_tokens"`
	FinishReason string `json:"finish_reason"`
}

type SSEErrorData struct {
	Code  string `json:"code"`
	MsgID string `json:"msg_id"`
}
