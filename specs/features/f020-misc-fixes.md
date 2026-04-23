# F-020: 小項修復

## 功能描述

Sprint 6 打包的多個小改善項目，每個獨立實作但合併為一個 feature issue 追蹤。

## 修復項目清單

### 20-A: Rate Limiter Per Provider

**問題**：目前 LlmService 只有一個全域 rate.Limiter，所有 provider 共用。當有多個 provider（如 LM Studio local + OpenAI cloud）時，local provider 的高頻呼叫會阻塞 cloud provider 的呼叫。

**修復**：rate limiter 移至 per-provider（已在 F-017 的 cachedClient 中實作）。此項確認 F-017 完成後測試涵蓋。

**影響檔案**：（由 F-017 涵蓋）

---

### 20-B: OAuth State 持久化

**問題**：GcalService 的 OAuth state 存在記憶體 map 中（`states map[string]time.Time`）。如果 server 重啟，進行中的 OAuth flow 會失敗（state 遺失）。

**修復**：將 OAuth state 存入 DB，使用 `oauth_states` 表。

**影響檔案**：
- `dev/src/service/gcal.go` -- 改用 DB 儲存 state
- `dev/src/repository/gcal_integration.go` -- 新增 SaveState / ValidateState / CleanExpiredStates 方法
- `dev/src/migration/010_create_oauth_states.up.sql`
- `dev/src/migration/010_create_oauth_states.down.sql`

**DB Schema**：
```sql
CREATE TABLE oauth_states (
    state VARCHAR(64) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 自動清理過期 state（10 分鐘）
CREATE INDEX idx_oauth_states_created_at ON oauth_states (created_at);
```

**Scenarios**：

#### WHEN 使用者開始 OAuth flow 後 server 重啟
- THEN 重啟後 callback 仍能驗證 state
- THEN OAuth flow 成功完成

#### WHEN state 超過 10 分鐘
- THEN ValidateState 回傳 false
- THEN callback 回傳 400 Bad Request

---

### 20-C: 環境變數啟動驗證

**問題**：目前 config.Load() 只驗證 DATABASE_URL，其他必要環境變數（如 AIBO_ENCRYPTION_KEY）缺失時不會提前報錯，而是在使用時才 panic。

**修復**：在 config.Load() 中統一驗證所有必要環境變數，缺失時明確列出。

**影響檔案**：
- `dev/src/config/config.go` -- 新增驗證邏輯

**必要環境變數**：
| 變數 | 必要性 | 說明 |
|------|--------|------|
| DATABASE_URL | 必要 | PostgreSQL 連線字串 |
| AIBO_ENCRYPTION_KEY | 必要 | AES-256 加密金鑰（32 bytes hex） |
| SERVER_PORT | 選填 | 預設 8080 |
| GOOGLE_CLIENT_ID | 選填 | Google OAuth（GCal 功能需要） |
| GOOGLE_CLIENT_SECRET | 選填 | Google OAuth（GCal 功能需要） |
| GOOGLE_REDIRECT_URL | 選填 | 預設 http://localhost:8080/api/v1/integrations/gcal/callback |

**Scenarios**：

#### WHEN DATABASE_URL 未設定
- THEN 啟動失敗，錯誤訊息：「DATABASE_URL 環境變數未設定」

#### WHEN AIBO_ENCRYPTION_KEY 未設定
- THEN 啟動失敗，錯誤訊息：「AIBO_ENCRYPTION_KEY 環境變數未設定」

#### WHEN 多個必要變數缺失
- THEN 啟動失敗，一次列出所有缺失的變數

#### WHEN AIBO_ENCRYPTION_KEY 長度不正確（非 64 hex chars / 32 bytes）
- THEN 啟動失敗，錯誤訊息：「AIBO_ENCRYPTION_KEY 格式無效，需為 64 字元的 hex 字串」

---

### 20-D: repo_path 安全驗證

**問題**：GitImportService 接受使用者傳入的 repo_path，但沒有驗證路徑是否在允許範圍內。惡意使用者可能傳入 `/etc/passwd` 等敏感路徑。

**修復**：新增允許路徑白名單設定，限制 repo_path 必須在白名單目錄下。

**影響檔案**：
- `dev/src/config/config.go` -- 新增 ALLOWED_REPO_PATHS 環境變數
- `dev/src/service/git_import.go` -- 驗證 repo_path 在白名單內

**環境變數**：
```
ALLOWED_REPO_PATHS=/home/user/repos,/data/git
```

**Scenarios**：

#### WHEN repo_path 在白名單目錄下
- THEN 匯入正常執行

#### WHEN repo_path 不在白名單目錄下
- THEN 回傳 403 Forbidden：「repo_path 不在允許的路徑範圍內」

#### WHEN repo_path 包含 `..` 目錄遍歷
- THEN 先 filepath.Clean() 再比對白名單
- THEN 遍歷攻擊被阻擋

#### WHEN ALLOWED_REPO_PATHS 未設定
- THEN 允許任何路徑（向下相容，但 log warning）

---

### 20-E: Go 版本對齊

**問題**：go.mod 目前指定 `go 1.23`，但部分 indirect dependency 可能需要更新。確保 Dockerfile 和 go.mod 的 Go 版本一致。

**修復**：
1. 確認 Dockerfile 使用 `golang:1.23-alpine` 作為 builder
2. 執行 `go mod tidy` 清理過時的依賴
3. 確認 CI/CD 環境的 Go 版本一致

**影響檔案**：
- `dev/src/go.mod` -- 版本確認
- `dev/src/Dockerfile` -- 版本確認

**Scenarios**：

#### WHEN go.mod 和 Dockerfile 的 Go 版本一致
- THEN 本地開發和 Docker build 行為一致

#### WHEN 執行 go mod tidy
- THEN 無多餘或缺失的依賴
