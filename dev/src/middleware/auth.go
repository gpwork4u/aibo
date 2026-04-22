package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

const (
	apiKeyHeader = "X-API-Key"
)

// AuthMiddleware API Key 認證 middleware
func AuthMiddleware(apiKeySvc *service.ApiKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Bootstrap 偵測：POST /api/v1/auth/api-keys 且無任何 key 時免認證
		if c.Request.Method == http.MethodPost && c.FullPath() == "/api/v1/auth/api-keys" {
			isBootstrap, err := apiKeySvc.IsBootstrap(c.Request.Context())
			if err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, dto.ErrorResponse{
					Code:    "INTERNAL_ERROR",
					Message: "伺服器內部錯誤",
				})
				return
			}
			if isBootstrap {
				c.Set("bootstrap", true)
				c.Next()
				return
			}
		}

		// 取得 API Key
		rawKey := c.GetHeader(apiKeyHeader)
		if rawKey == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{
				Code:    model.ErrCodeUnauthorized,
				Message: "缺少 X-API-Key header",
			})
			return
		}

		// 驗證 API Key
		apiKey, err := apiKeySvc.ValidateKey(c.Request.Context(), rawKey)
		if err != nil {
			if appErr, ok := err.(*model.AppError); ok {
				c.AbortWithStatusJSON(appErr.Status, dto.ErrorResponse{
					Code:    appErr.Code,
					Message: appErr.Message,
				})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, dto.ErrorResponse{
				Code:    "INTERNAL_ERROR",
				Message: "伺服器內部錯誤",
			})
			return
		}

		// 將驗證通過的 key 資訊存入 context
		c.Set("api_key", apiKey)
		c.Next()
	}
}
