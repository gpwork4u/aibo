package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// CopilotStreamHandler SSE 串流 handler（F-039 skeleton，完整實作屬於 F-048）
type CopilotStreamHandler struct{}

// NewCopilotStreamHandler 建立新的 CopilotStreamHandler
func NewCopilotStreamHandler() *CopilotStreamHandler {
	return &CopilotStreamHandler{}
}

// Stream SSE skeleton：每 15s 送 ping，並送出一個 demo event
// GET /api/v1/copilot/stream
func (h *CopilotStreamHandler) Stream(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	// demo event（寫死 hello）
	msgID := "demo-001"
	seq := 1
	eventID := fmt.Sprintf("%s:%d", msgID, seq)
	c.Writer.WriteString(fmt.Sprintf("id: %s\nevent: message\ndata: hello\n\n", eventID))
	c.Writer.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	ctx := c.Request.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.Writer.WriteString("event: ping\ndata: {}\n\n")
			c.Writer.Flush()
		}
	}
}
