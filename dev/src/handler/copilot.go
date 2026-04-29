package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// pendingStream 等待 SSE 連線消費的 stream 資訊
type pendingStream struct {
	sessionID uuid.UUID
	msgID     uuid.UUID
	ch        chan service.StreamEvent
}

// CopilotHandler 完整 Copilot handler（含 REST + SSE）
type CopilotHandler struct {
	svc *service.CopilotService
	mu  sync.Mutex
	// 以 msgID 為 key，暫存待消費的 stream channel
	pending map[uuid.UUID]*pendingStream
}

// NewCopilotHandler 建立新的 CopilotHandler
func NewCopilotHandler(svc *service.CopilotService) *CopilotHandler {
	return &CopilotHandler{
		svc:     svc,
		pending: make(map[uuid.UUID]*pendingStream),
	}
}

// --- Session CRUD ---

// CreateSession POST /api/v1/copilot/sessions
func (h *CopilotHandler) CreateSession(c *gin.Context) {
	sess, err := h.svc.CreateSession(c.Request.Context(), "admin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, dto.CreateSessionResponse{
		SessionID: sess.ID.String(),
		CreatedAt: sess.CreatedAt,
	})
}

// DeleteSession DELETE /api/v1/copilot/sessions/:id
func (h *CopilotHandler) DeleteSession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_INPUT", "error": "invalid session id"})
		return
	}
	if err := h.svc.DeleteSession(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"code": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ListMessages GET /api/v1/copilot/sessions/:id/messages
func (h *CopilotHandler) ListMessages(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_INPUT", "error": "invalid session id"})
		return
	}
	msgs, err := h.svc.ListMessages(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"code": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	items := make([]dto.CopilotMessageItem, 0, len(msgs))
	for _, m := range msgs {
		items = append(items, dto.CopilotMessageItem{
			ID:        m.ID,
			Role:      m.Role,
			Content:   m.Content,
			Seq:       m.Seq,
			CreatedAt: m.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, dto.ListMessagesResponse{Messages: items})
}

// --- Message + SSE ---

// SendMessage POST /api/v1/copilot/message
// 儲存 user message，確認 LLM 可用，啟動 background streaming goroutine
func (h *CopilotHandler) SendMessage(c *gin.Context) {
	var req dto.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_INPUT", "error": err.Error()})
		return
	}

	msgID, err := h.svc.StartStream(c.Request.Context(), req.SessionID, req.Content)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"code": "NOT_FOUND"})
			return
		}
		if errors.Is(err, service.ErrLLMUnavailable) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"code": "LLM_UNAVAILABLE"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ch := make(chan service.StreamEvent, 64)
	ps := &pendingStream{
		sessionID: req.SessionID,
		msgID:     msgID,
		ch:        ch,
	}

	h.mu.Lock()
	h.pending[msgID] = ps
	h.mu.Unlock()

	// 背景 goroutine 執行 LLM streaming
	go func() {
		defer func() {
			close(ch)
			h.mu.Lock()
			delete(h.pending, msgID)
			h.mu.Unlock()
		}()
		// 使用 background context，不受 HTTP request context 影響
		h.svc.StreamChat(context.Background(), req.SessionID, msgID, ch)
	}()

	c.JSON(http.StatusOK, dto.SendMessageResponse{
		MsgID:       msgID.String(),
		StreamReady: true,
	})
}

// Stream GET /api/v1/copilot/stream?msg_id=<uuid>
// SSE endpoint：消費 pending channel 並推送 token 事件
func (h *CopilotHandler) Stream(c *gin.Context) {
	msgIDStr := c.Query("msg_id")
	if msgIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_INPUT", "error": "msg_id required"})
		return
	}
	msgID, err := uuid.Parse(msgIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_INPUT", "error": "invalid msg_id"})
		return
	}

	// 等待 pending stream 最多 5 秒（POST /message 先觸發，GET /stream 後到達）
	var ps *pendingStream
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		h.mu.Lock()
		ps = h.pending[msgID]
		h.mu.Unlock()
		if ps != nil {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	if ps == nil {
		c.JSON(http.StatusNotFound, gin.H{"code": "NOT_FOUND", "error": "stream not found or already consumed"})
		return
	}

	// 設定 SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	// ping ticker（每 15 秒）
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	pingSeq := 0
	reqCtx := c.Request.Context()

	writeSSE := func(event, data string) {
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, data)
		c.Writer.Flush()
	}

	for {
		select {
		case <-reqCtx.Done():
			// 客戶端斷線
			return

		case <-ticker.C:
			pingSeq++
			pingData, _ := json.Marshal(dto.SSEPingData{
				Ts:    time.Now().UTC(),
				MsgID: msgID.String(),
				Seq:   pingSeq,
			})
			writeSSE("ping", string(pingData))

		case evt, ok := <-ps.ch:
			if !ok {
				// channel 已關閉，streaming 結束
				return
			}
			writeSSE(evt.Event, evt.Data)
		}
	}
}

// writeSSELine 是 Stream 中的本地輔助，已內嵌於 writeSSE closure，此函式保留以備測試用
func writeSSELine(w io.Writer, event, data string) {
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
}

// compile-time interface checks
var _ = (*model.CopilotSession)(nil)
