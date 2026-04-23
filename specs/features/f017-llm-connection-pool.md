# F-017: LLM Client 連線池

## 功能描述

目前 `LlmService.Classify()` 和 `LlmService.ExpandSynonyms()` 每次呼叫都重新建立 `openai.Client`（含 HTTP transport），造成不必要的資源浪費和連線延遲。改為依 provider ID 快取 client 實例，相同 provider 重用同一個 client。

## 使用者故事

As a system operator, I want LLM API calls to reuse HTTP connections, so that response latency is reduced and system resources are used efficiently.

## 問題分析

### 現狀（llm.go）

```go
// Classify() 和 ExpandSynonyms() 各自重複以下邏輯：
config := openai.DefaultConfig(apiKey)
config.BaseURL = strings.TrimRight(provider.EndpointURL, "/")
if !strings.HasSuffix(config.BaseURL, "/v1") {
    config.BaseURL = config.BaseURL + "/v1"
}
client := openai.NewClientWithConfig(config) // 每次都 new
```

### 目標

- 以 `provider.ID` 為 key，快取 `*openai.Client` 實例
- Provider 設定（endpoint_url / api_key / model_name）變更時自動失效快取
- 提供 `InvalidateClient(providerID)` 方法，供 LlmProviderService 在 Update/Delete 時呼叫
- 使用 `sync.RWMutex` 保護 map，確保 goroutine safe

## API Contract

無 API 變更，純內部重構。

## Data Model

無變更。

## Scenarios

### WHEN 首次呼叫某 provider 的 LLM API
- THEN 建立新的 openai.Client 並快取
- THEN API 呼叫成功

### WHEN 第二次呼叫相同 provider
- THEN 從快取取得 client（不重新建立）
- THEN API 呼叫成功

### WHEN provider 的 endpoint_url 或 api_key 被更新
- THEN LlmProviderService.Update() 呼叫 InvalidateClient(providerID)
- THEN 下次呼叫時建立新的 client

### WHEN provider 被刪除
- THEN LlmProviderService.Delete() 呼叫 InvalidateClient(providerID)
- THEN 快取中移除該 provider 的 client

### WHEN rate limiter 改為 per-provider
- THEN 每個 provider 有自己的 rate.Limiter
- THEN 不同 provider 的呼叫不互相阻塞

## 實作指引

### 需要修改的檔案
- `dev/src/service/llm.go` -- 新增 clientCache map + getOrCreateClient() + InvalidateClient()
- `dev/src/service/llm_provider.go` -- Update/Delete 時呼叫 InvalidateClient()

### 快取結構

```go
type cachedClient struct {
    client   *openai.Client
    limiter  *rate.Limiter
    configHash string  // endpoint_url + apiKey hash，用於偵測變更
}

type LlmService struct {
    providerSvc *LlmProviderService
    crypto      *crypto.AESCrypto
    mu          sync.RWMutex
    clients     map[uuid.UUID]*cachedClient
}
```

### 關鍵邏輯

1. `getOrCreateClient(provider)` -- 先 RLock 查 map，miss 時 Lock 建立
2. configHash = sha256(endpointURL + decryptedApiKey) -- 偵測 provider 設定是否變更
3. 移除全域 `limiter *rate.Limiter`，改為 per-provider limiter 存在 cachedClient 中
4. Classify() 和 ExpandSynonyms() 合併重複的 client 建立邏輯，統一呼叫 getOrCreateClient()

### Unit Tests
- `dev/__tests__/service/llm_pool_test.go`
  - TestGetOrCreateClient_CacheHit
  - TestGetOrCreateClient_CacheMiss
  - TestInvalidateClient_RemovesFromCache
  - TestConfigChange_RecreatesClient
