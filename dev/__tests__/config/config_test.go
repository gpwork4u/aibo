package config_test

import (
	"os"
	"strings"
	"testing"

	"github.com/gpwork4u/aibo/config"
)

// validEncryptionKey 是有效的 64 hex chars（32 bytes）
const validEncryptionKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

// helper: 設定必要環境變數
func setRequiredEnvVars(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/test")
	t.Setenv("AIBO_ENCRYPTION_KEY", validEncryptionKey)
}

func TestLoad_MissingDatabaseURL(t *testing.T) {
	t.Setenv("AIBO_ENCRYPTION_KEY", validEncryptionKey)
	os.Unsetenv("DATABASE_URL")

	_, err := config.Load()
	if err == nil {
		t.Fatal("預期應回傳錯誤，但沒有")
	}
	if !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Errorf("錯誤訊息應包含 DATABASE_URL，實際: %s", err.Error())
	}
}

func TestLoad_MissingEncryptionKey(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/test")
	os.Unsetenv("AIBO_ENCRYPTION_KEY")

	_, err := config.Load()
	if err == nil {
		t.Fatal("預期應回傳錯誤，但沒有")
	}
	if !strings.Contains(err.Error(), "AIBO_ENCRYPTION_KEY") {
		t.Errorf("錯誤訊息應包含 AIBO_ENCRYPTION_KEY，實際: %s", err.Error())
	}
}

func TestLoad_MultipleMissingVars(t *testing.T) {
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("AIBO_ENCRYPTION_KEY")

	_, err := config.Load()
	if err == nil {
		t.Fatal("預期應回傳錯誤，但沒有")
	}
	errMsg := err.Error()
	if !strings.Contains(errMsg, "DATABASE_URL") || !strings.Contains(errMsg, "AIBO_ENCRYPTION_KEY") {
		t.Errorf("錯誤訊息應同時包含 DATABASE_URL 和 AIBO_ENCRYPTION_KEY，實際: %s", errMsg)
	}
}

func TestLoad_InvalidEncryptionKeyFormat(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/test")
	t.Setenv("AIBO_ENCRYPTION_KEY", "not-a-valid-hex-key")

	_, err := config.Load()
	if err == nil {
		t.Fatal("預期應回傳錯誤，但沒有")
	}
	if !strings.Contains(err.Error(), "AIBO_ENCRYPTION_KEY 格式無效") {
		t.Errorf("錯誤訊息應包含格式無效提示，實際: %s", err.Error())
	}
}

func TestLoad_ValidConfig(t *testing.T) {
	setRequiredEnvVars(t)

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() 不應回傳錯誤: %v", err)
	}
	if cfg.DatabaseURL == "" {
		t.Error("DatabaseURL 不應為空")
	}
	if cfg.ServerPort != "8080" {
		t.Errorf("ServerPort 預設應為 8080，實際: %s", cfg.ServerPort)
	}
}

func TestLoad_AllowedRepoPaths(t *testing.T) {
	setRequiredEnvVars(t)
	t.Setenv("ALLOWED_REPO_PATHS", "/home/user/repos,/data/git")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if len(cfg.AllowedRepoPaths) != 2 {
		t.Fatalf("AllowedRepoPaths 長度應為 2，實際: %d", len(cfg.AllowedRepoPaths))
	}
	if cfg.AllowedRepoPaths[0] != "/home/user/repos" {
		t.Errorf("AllowedRepoPaths[0] = %s, want /home/user/repos", cfg.AllowedRepoPaths[0])
	}
	if cfg.AllowedRepoPaths[1] != "/data/git" {
		t.Errorf("AllowedRepoPaths[1] = %s, want /data/git", cfg.AllowedRepoPaths[1])
	}
}

func TestLoad_AllowedRepoPathsEmpty(t *testing.T) {
	setRequiredEnvVars(t)
	os.Unsetenv("ALLOWED_REPO_PATHS")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.AllowedRepoPaths != nil {
		t.Errorf("AllowedRepoPaths 未設定時應為 nil，實際: %v", cfg.AllowedRepoPaths)
	}
}
