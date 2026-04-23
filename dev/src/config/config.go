package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config 應用程式設定
type Config struct {
	DatabaseURL       string
	ServerPort        string
	GoogleClientID    string
	GoogleClientSecret string
	GoogleRedirectURL string
}

// Load 從環境變數載入設定
func Load() (*Config, error) {
	// 嘗試載入 .env 檔案（不存在也不報錯）
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL 環境變數未設定")
	}

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	googleRedirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if googleRedirectURL == "" {
		googleRedirectURL = "http://localhost:8080/api/v1/integrations/gcal/callback"
	}

	return &Config{
		DatabaseURL:       dbURL,
		ServerPort:        port,
		GoogleClientID:    os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL: googleRedirectURL,
	}, nil
}
