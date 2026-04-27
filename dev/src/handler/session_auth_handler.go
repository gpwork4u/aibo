package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/middleware"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

const (
	sessionMaxAge = 30 * 24 * 60 * 60 // 30 天（秒）
)

// SessionAuthHandler cookie session 認證相關 handler
type SessionAuthHandler struct {
	sessionRepo *repository.SessionRepository
}

// NewSessionAuthHandler 建立新的 SessionAuthHandler
func NewSessionAuthHandler(sessionRepo *repository.SessionRepository) *SessionAuthHandler {
	return &SessionAuthHandler{sessionRepo: sessionRepo}
}

// Login 登入：POST /api/v1/auth/login
// body: {"api_key": "<master_key>"}
func (h *SessionAuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.APIKey == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "BAD_REQUEST",
			Message: "缺少 api_key 欄位",
		})
		return
	}

	// 驗證 master key（環境變數 AIBO_MASTER_KEY 或 AIBO_API_KEY）
	masterKey := os.Getenv("AIBO_MASTER_KEY")
	if masterKey == "" {
		masterKey = os.Getenv("AIBO_API_KEY")
	}
	if masterKey == "" || req.APIKey != masterKey {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    model.ErrCodeUnauthorized,
			Message: "API Key 無效",
		})
		return
	}

	// 產生隨機 token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "產生 session token 失敗",
		})
		return
	}
	token := hex.EncodeToString(tokenBytes)
	tokenHash := middleware.HashSessionToken(token)

	session := &model.Session{
		ID:        uuid.New(),
		TokenHash: tokenHash,
		UserLabel: "owner",
		ExpiresAt: time.Now().Add(sessionMaxAge * time.Second),
		CreatedAt: time.Now(),
	}

	if err := h.sessionRepo.Create(c.Request.Context(), session); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "建立 session 失敗",
		})
		return
	}

	// Set-Cookie
	c.SetCookie(middleware.SessionCookieName, token, sessionMaxAge, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"label": session.UserLabel, "expires_at": session.ExpiresAt})
}

// Logout 登出：POST /api/v1/auth/logout
func (h *SessionAuthHandler) Logout(c *gin.Context) {
	token, err := c.Cookie(middleware.SessionCookieName)
	if err != nil || token == "" {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    model.ErrCodeUnauthorized,
			Message: "未登入",
		})
		return
	}

	tokenHash := middleware.HashSessionToken(token)
	if err := h.sessionRepo.Delete(c.Request.Context(), tokenHash); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "登出失敗",
		})
		return
	}

	// 清除 cookie
	c.SetCookie(middleware.SessionCookieName, "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "已登出"})
}

// Me 查看目前認證狀態：GET /api/v1/auth/me
func (h *SessionAuthHandler) Me(c *gin.Context) {
	// 從 context 取得認證資訊
	authMethod, _ := c.Get("auth_method")

	if sessionVal, exists := c.Get("session"); exists {
		session := sessionVal.(*model.Session)
		c.JSON(http.StatusOK, gin.H{
			"label":       session.UserLabel,
			"auth_method": authMethod,
		})
		return
	}

	if _, exists := c.Get("api_key"); exists {
		c.JSON(http.StatusOK, gin.H{
			"label":       "owner",
			"auth_method": authMethod,
		})
		return
	}

	c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
		Code:    model.ErrCodeUnauthorized,
		Message: "未認證",
	})
}
