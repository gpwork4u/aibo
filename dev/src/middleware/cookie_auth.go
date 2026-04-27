package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

const (
	SessionCookieName = "aibo_session"
	sessionContextKey = "session"
	authMethodKey     = "auth_method"
)

// CookieOrAPIKeyMiddleware 同時接受 cookie session 或 API Key 兩種認證方式
func CookieOrAPIKeyMiddleware(apiKeySvc *service.ApiKeyService, sessionRepo *repository.SessionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 嘗試 cookie session 認證
		token, err := c.Cookie(SessionCookieName)
		if err == nil && token != "" {
			hash := HashSessionToken(token)
			session, err := sessionRepo.FindByTokenHash(c.Request.Context(), hash)
			if err == nil && session != nil {
				c.Set(sessionContextKey, session)
				c.Set(authMethodKey, "cookie")
				c.Next()
				return
			}
		}

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

		// 嘗試 API Key 認證
		rawKey := c.GetHeader(apiKeyHeader)
		if rawKey == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{
				Code:    model.ErrCodeUnauthorized,
				Message: "缺少認證資訊，請提供 X-API-Key header 或有效的 session cookie",
			})
			return
		}

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

		c.Set("api_key", apiKey)
		c.Set(authMethodKey, "api_key")
		c.Next()
	}
}

// HashSessionToken 對 session token 做 SHA-256 hash（exported，供 handler 使用）
func HashSessionToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
