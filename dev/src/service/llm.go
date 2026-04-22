package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
	"golang.org/x/time/rate"

	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
)

// LlmService 統一的 LLM 呼叫介面
type LlmService struct {
	providerSvc *LlmProviderService
	crypto      *crypto.AESCrypto
	limiter     *rate.Limiter
}

// NewLlmService 建立新的 LlmService
func NewLlmService(providerSvc *LlmProviderService, aesCrypto *crypto.AESCrypto) *LlmService {
	return &LlmService{
		providerSvc: providerSvc,
		crypto:      aesCrypto,
		limiter:     rate.NewLimiter(rate.Every(time.Second), 5), // 每秒最多 5 個請求
	}
}

// classifySystemPrompt 分類用的 system prompt
const classifySystemPrompt = `你是一個知識分類助手。根據使用者提供的內容，分析其主題並回傳 JSON 格式的分類結果。

回傳格式必須嚴格為：
{"category": "分類名稱", "tags": ["tag1", "tag2"], "title": "建議標題"}

規則：
1. category：選擇最適合的分類名稱，簡潔明確
2. tags：提取 2-5 個關鍵字作為標籤，使用小寫英文或中文
3. title：根據內容產生一個簡潔的標題（不超過 50 字）

只回傳 JSON，不要包含任何其他文字、說明或 markdown 格式。`

// Classify 呼叫 LLM 進行分類
func (s *LlmService) Classify(ctx context.Context, content string, existingCategories []string) (*dto.ClassifyResult, error) {
	// 取得 active provider
	provider, err := s.providerSvc.GetActiveProvider(ctx)
	if err != nil {
		return nil, fmt.Errorf("取得 LLM provider 失敗: %w", err)
	}

	// 解密 api_key
	apiKey := ""
	if provider.ApiKey != nil && *provider.ApiKey != "" {
		decrypted, err := s.crypto.Decrypt(*provider.ApiKey)
		if err != nil {
			return nil, fmt.Errorf("解密 API Key 失敗: %w", err)
		}
		apiKey = decrypted
	}

	// 建立 go-openai client
	config := openai.DefaultConfig(apiKey)
	config.BaseURL = strings.TrimRight(provider.EndpointURL, "/")
	if !strings.HasSuffix(config.BaseURL, "/v1") {
		config.BaseURL = config.BaseURL + "/v1"
	}
	client := openai.NewClientWithConfig(config)

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

	// 等待 rate limiter
	if err := s.limiter.Wait(callCtx); err != nil {
		return nil, fmt.Errorf("rate limit 等待取消: %w", err)
	}

	slog.Info("呼叫 LLM 進行分類",
		"provider", provider.Name,
		"model", provider.ModelName,
	)

	resp, err := client.CreateChatCompletion(callCtx, openai.ChatCompletionRequest{
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
