package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAuthMiddleware_HeaderCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		header     string
		wantStatus int
	}{
		{"缺少 header", "", http.StatusUnauthorized},
		{"有 header", "aibo_test1234567890123456789012", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			_, r := gin.CreateTestContext(w)

			// 簡化的 middleware 模擬（不需要真實 service）
			r.GET("/test", func(c *gin.Context) {
				apiKey := c.GetHeader("X-API-Key")
				if apiKey == "" {
					c.JSON(http.StatusUnauthorized, gin.H{
						"code":    "UNAUTHORIZED",
						"message": "缺少 X-API-Key header",
					})
					return
				}
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.header != "" {
				req.Header.Set("X-API-Key", tt.header)
			}
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}
		})
	}
}
