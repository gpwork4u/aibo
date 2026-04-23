package config

import (
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config 應用程式設定
type Config struct {
	DatabaseURL        string
	ServerPort         string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	AllowedRepoPaths   []string // ALLOWED_REPO_PATHS 白名單（空 = 允許所有）
}

// Load 從環境變數載入設定
func Load() (*Config, error) {
	// 嘗試載入 .env 檔案（不存在也不報錯）
	_ = godotenv.Load()

	// 驗證必要環境變數
	var missing []string

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		missing = append(missing, "DATABASE_URL")
	}

	encKey := os.Getenv("AIBO_ENCRYPTION_KEY")
	if encKey == "" {
		missing = append(missing, "AIBO_ENCRYPTION_KEY")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("以下必要環境變數未設定: %s", strings.Join(missing, ", "))
	}

	// 驗證 AIBO_ENCRYPTION_KEY 格式（64 hex chars = 32 bytes）
	if err := validateEncryptionKey(encKey); err != nil {
		return nil, err
	}

	// 選填環境變數：缺失時 log warning
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if googleClientID == "" || googleClientSecret == "" {
		slog.Warn("Google OAuth 環境變數未設定（GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET），Google Calendar 功能將無法使用")
	}

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	googleRedirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if googleRedirectURL == "" {
		googleRedirectURL = "http://localhost:8080/api/v1/integrations/gcal/callback"
	}

	// 解析 ALLOWED_REPO_PATHS
	allowedRepoPaths := parseAllowedRepoPaths(os.Getenv("ALLOWED_REPO_PATHS"))

	return &Config{
		DatabaseURL:        dbURL,
		ServerPort:         port,
		GoogleClientID:     googleClientID,
		GoogleClientSecret: googleClientSecret,
		GoogleRedirectURL:  googleRedirectURL,
		AllowedRepoPaths:   allowedRepoPaths,
	}, nil
}

// validateEncryptionKey 驗證 AIBO_ENCRYPTION_KEY 格式
func validateEncryptionKey(key string) error {
	// 64 hex chars = 32 bytes
	if len(key) == 64 {
		if _, err := hex.DecodeString(key); err == nil {
			return nil
		}
	}
	return fmt.Errorf("AIBO_ENCRYPTION_KEY 格式無效，需為 64 字元的 hex 字串（32 bytes）")
}

// parseAllowedRepoPaths 解析逗號分隔的路徑白名單
func parseAllowedRepoPaths(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	var paths []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			paths = append(paths, p)
		}
	}
	return paths
}
