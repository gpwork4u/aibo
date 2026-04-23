package service

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	openai "github.com/sashabaranov/go-openai"
	"golang.org/x/time/rate"

	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
)

// cachedClient 快取的 openai client 與 per-provider rate limiter
type cachedClient struct {
	client     *openai.Client
	limiter    *rate.Limiter
	configHash string // sha256(endpointURL + apiKey)，用於偵測設定變更
}

// sharedTransport 所有 client 共用的 HTTP Transport，啟用連線池
var sharedTransport = &http.Transport{
	MaxIdleConns:        100,
	MaxIdleConnsPerHost: 10,
	IdleConnTimeout:     90 * time.Second,
	DialContext: (&net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}).DialContext,
}

// LlmService 統一的 LLM 呼叫介面
type LlmService struct {
	providerSvc *LlmProviderService
	crypto      *crypto.AESCrypto
	mu          sync.RWMutex
	clients     map[uuid.UUID]*cachedClient
}

// NewLlmService 建立新的 LlmService
func NewLlmService(providerSvc *LlmProviderService, aesCrypto *crypto.AESCrypto) *LlmService {
	return &LlmService{
		providerSvc: providerSvc,
		crypto:      aesCrypto,
		clients:     make(map[uuid.UUID]*cachedClient),
	}
}

// InvalidateClient 清除指定 provider 的快取 client
// 當 provider 設定變更或刪除時呼叫
func (s *LlmService) InvalidateClient(providerID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.clients, providerID)
	slog.Info("已清除 LLM client 快取", "provider_id", providerID)
}

// getOrCreateClient 取得或建立 openai client（含 per-provider rate limiter）
func (s *LlmService) getOrCreateClient(provider *model.LlmProvider, apiKey string) *cachedClient {
	hash := computeConfigHash(provider.EndpointURL, apiKey)

	// 先用 RLock 查快取
	s.mu.RLock()
	if cached, ok := s.clients[provider.ID]; ok && cached.configHash == hash {
		s.mu.RUnlock()
		return cached
	}
	s.mu.RUnlock()

	// cache miss 或 config 已變更，用 Lock 建立新的
	s.mu.Lock()
	defer s.mu.Unlock()

	// double-check（避免多個 goroutine 同時 miss）
	if cached, ok := s.clients[provider.ID]; ok && cached.configHash == hash {
		return cached
	}

	config := openai.DefaultConfig(apiKey)
	config.BaseURL = strings.TrimRight(provider.EndpointURL, "/")
	if !strings.HasSuffix(config.BaseURL, "/v1") {
		config.BaseURL = config.BaseURL + "/v1"
	}
	config.HTTPClient = &http.Client{
		Transport: sharedTransport,
	}

	cached := &cachedClient{
		client:     openai.NewClientWithConfig(config),
		limiter:    rate.NewLimiter(rate.Every(time.Second), 5), // 每個 provider 每秒最多 5 個請求
		configHash: hash,
	}
	s.clients[provider.ID] = cached

	slog.Info("建立新的 LLM client", "provider_id", provider.ID, "provider_name", provider.Name)
	return cached
}

// computeConfigHash 計算 provider 設定的 hash，用於偵測變更
func computeConfigHash(endpointURL, apiKey string) string {
	h := sha256.Sum256([]byte(endpointURL + "|" + apiKey))
	return fmt.Sprintf("%x", h)
}

// ClientCacheLen 回傳目前快取的 client 數量（供測試使用）
func (s *LlmService) ClientCacheLen() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.clients)
}

// HasCachedClient 檢查指定 provider 是否有快取的 client（供測試使用）
func (s *LlmService) HasCachedClient(providerID uuid.UUID) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.clients[providerID]
	return ok
}

// WarmClient 預熱指定 provider 的 client 快取（供測試和外部呼叫）
// 回傳 client 實例的指標位址字串，相同字串代表同一個 cached client
func (s *LlmService) WarmClient(provider *model.LlmProvider, apiKey string) string {
	c := s.getOrCreateClient(provider, apiKey)
	return fmt.Sprintf("%p", c)
}

// classifySystemPrompt 分類用的 system prompt
const classifySystemPrompt = `你是一個知識分類助手。根據使用者提供的內容，分析其主題並回傳 JSON 格式的分類結果。

回傳格式必須嚴格為：
{
  "category": "分類名稱",
  "tags": ["tag1", "tag2"],
  "domains": ["domain1", "domain2"],
  "context": {
    "languages": ["go", "python"],
    "frameworks": ["gin"],
    "pattern": "middleware",
    "environment": "docker",
    "use_case": "authentication"
  },
  "title": "建議標題",
  "summary": "一句話摘要（30字以內）",
  "detail": "詳細說明（保留原始內容的關鍵資訊，100-300字）",
  "action": "可執行的建議或行動（如：使用 X 來解決 Y；在 Z 場景下採用此方案）"
}

規則：
1. category：選擇最適合的分類名稱，簡潔明確
2. tags：提取 2-5 個關鍵字作為標籤，使用小寫英文或中文
3. domains：提取 1-3 個技術領域標籤（如 golang, postgresql, docker, frontend, backend），使用小寫英文
4. context：多維度情境標籤，只包含相關的 key：
   - languages：程式語言（如 go, python, javascript）
   - frameworks：框架（如 gin, fastapi, react）
   - pattern：設計模式或架構模式（如 middleware, singleton, api-integration）
   - environment：執行環境（如 docker, kubernetes, local）
   - use_case：應用場景（如 authentication, logging, monitoring）
   如果某個 key 不適用，省略該 key 即可
5. title：根據內容產生一個簡潔的標題（不超過 50 字）
6. summary：用一句話概括這則知識的核心觀點
7. detail：萃取內容中的關鍵資訊、步驟或論點
8. action：如果內容包含可操作的建議，提取為行動指引；如果是純知識性內容，寫「供參考」

只回傳 JSON，不要包含任何其他文字、說明或 markdown 格式。`

// Classify 呼叫 LLM 進行分類
func (s *LlmService) Classify(ctx context.Context, content string, existingCategories []string) (*dto.ClassifyResult, error) {
	// 取得 active provider
	provider, err := s.providerSvc.GetActiveProvider(ctx)
	if err != nil {
		return nil, fmt.Errorf("取得 LLM provider 失敗: %w", err)
	}

	// 解密 api_key 並取得快取 client
	apiKey := ""
	if provider.ApiKey != nil && *provider.ApiKey != "" {
		decrypted, err := s.crypto.Decrypt(*provider.ApiKey)
		if err != nil {
			return nil, fmt.Errorf("解密 API Key 失敗: %w", err)
		}
		apiKey = decrypted
	}

	cached := s.getOrCreateClient(provider, apiKey)

	// 組裝 user prompt
	userPrompt := content
	if len(existingCategories) > 0 {
		userPrompt = fmt.Sprintf("現有的分類列表：%s\n\n請優先從以上分類中選擇，如果都不適合再建議新分類。\n\n以下是要分類的內容：\n%s",
			strings.Join(existingCategories, "、"), content)
	}

	// 取得 timeout 設定
	timeout := 30 * time.Second
	if provider.Config != nil {
		var cfg model.LlmProviderConfig
		if err := json.Unmarshal(*provider.Config, &cfg); err == nil && cfg.TimeoutSeconds != nil {
			timeout = time.Duration(*cfg.TimeoutSeconds) * time.Second
		}
	}

	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// 等待 per-provider rate limiter
	if err := cached.limiter.Wait(callCtx); err != nil {
		return nil, fmt.Errorf("rate limit 等待取消: %w", err)
	}

	slog.Info("呼叫 LLM 進行分類",
		"provider", provider.Name,
		"model", provider.ModelName,
	)

	resp, err := cached.client.CreateChatCompletion(callCtx, openai.ChatCompletionRequest{
		Model: provider.ModelName,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: classifySystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: userPrompt},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("LLM API 呼叫失敗: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("LLM 回傳空結果")
	}

	rawContent := resp.Choices[0].Message.Content
	result, err := parseClassifyResult(rawContent)
	if err != nil {
		slog.Error("LLM 回傳格式解析失敗", "raw", rawContent, "error", err)
		return nil, err
	}

	return result, nil
}

// synonymSystemPrompt 同義詞展開用的 system prompt
const synonymSystemPrompt = `你是一個搜尋助手。根據使用者的搜尋查詢，列出相關的同義詞和替代關鍵字。
回傳 JSON 格式：{"synonyms": ["keyword1", "keyword2", ...]}
包含原始查詢詞、翻譯（中英互譯）、縮寫、別名。最多 10 個關鍵字。
只回傳 JSON，不要包含任何其他文字。`

// SynonymResult 同義詞展開結果
type SynonymResult struct {
	Synonyms []string `json:"synonyms"`
}

// ExpandSynonyms 呼叫 LLM 展開同義關鍵字
// timeout 10 秒，失敗時回傳 nil 和 error（呼叫端自行降級）
func (s *LlmService) ExpandSynonyms(ctx context.Context, query string) ([]string, error) {
	// 取得可用的 provider
	provider, err := s.providerSvc.GetActiveProvider(ctx)
	if err != nil {
		return nil, fmt.Errorf("無可用的 LLM Provider: %w", err)
	}

	// 解密 api_key 並取得快取 client
	apiKey := ""
	if provider.ApiKey != nil && *provider.ApiKey != "" {
		decrypted, err := s.crypto.Decrypt(*provider.ApiKey)
		if err != nil {
			return nil, fmt.Errorf("解密 API Key 失敗: %w", err)
		}
		apiKey = decrypted
	}

	cached := s.getOrCreateClient(provider, apiKey)

	// 設定 10 秒 timeout
	callCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// 等待 per-provider rate limiter
	if err := cached.limiter.Wait(callCtx); err != nil {
		return nil, fmt.Errorf("rate limit 等待取消: %w", err)
	}

	userPrompt := fmt.Sprintf("使用者查詢：%s", query)

	slog.Info("呼叫 LLM 展開同義詞",
		"provider", provider.Name,
		"model", provider.ModelName,
		"query", query,
	)

	resp, err := cached.client.CreateChatCompletion(callCtx, openai.ChatCompletionRequest{
		Model: provider.ModelName,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: synonymSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: userPrompt},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		MaxTokens: 200,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM API 呼叫失敗: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("LLM 回傳空結果")
	}

	rawContent := resp.Choices[0].Message.Content
	result, err := parseSynonymResult(rawContent)
	if err != nil {
		slog.Error("同義詞展開結果解析失敗", "raw", rawContent, "error", err)
		return nil, err
	}

	// 限制最多 10 個
	if len(result.Synonyms) > 10 {
		result.Synonyms = result.Synonyms[:10]
	}

	slog.Info("同義詞展開完成", "query", query, "synonyms", result.Synonyms)
	return result.Synonyms, nil
}

// parseSynonymResult 解析 LLM 回傳的同義詞 JSON
func parseSynonymResult(raw string) (*SynonymResult, error) {
	var result SynonymResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("同義詞 JSON 解析失敗: %w", err)
	}
	if len(result.Synonyms) == 0 {
		slog.Warn("LLM 判斷無同義詞，回傳空列表", "raw", raw)
		return &result, nil
	}
	return &result, nil
}

// parseClassifyResult 解析 LLM 回傳的分類 JSON
func parseClassifyResult(raw string) (*dto.ClassifyResult, error) {
	var result dto.ClassifyResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("LLM 回傳格式無效: %w", err)
	}
	if result.Category == "" {
		return nil, fmt.Errorf("LLM 回傳缺少 category 欄位")
	}
	return &result, nil
}
