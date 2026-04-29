package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	openai "github.com/sashabaranov/go-openai"

	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// CopilotRepo 定義 CopilotService 需要的資料存取介面
type CopilotRepo interface {
	CreateSession(ctx context.Context, userID string) (*model.CopilotSession, error)
	GetSession(ctx context.Context, id uuid.UUID) (*model.CopilotSession, error)
	DeleteSession(ctx context.Context, id uuid.UUID) error
	TouchSession(ctx context.Context, id uuid.UUID) error
	NextSeq(ctx context.Context, sessionID uuid.UUID) (int, error)
	CreateMessage(ctx context.Context, msg *model.CopilotMessage) error
	ListMessages(ctx context.Context, sessionID uuid.UUID) ([]model.CopilotMessage, error)
	ListRecentMessages(ctx context.Context, sessionID uuid.UUID, maxRounds int) ([]model.CopilotMessage, error)
}

// copilotEntryRepo 只使用 EntryRepository 的 List 方法子集
type copilotEntryRepo interface {
	List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error)
}

// StreamEvent SSE 事件型別
type StreamEvent struct {
	Event string
	Data  string
}

// CopilotService Copilot 業務邏輯服務
type CopilotService struct {
	repo      CopilotRepo
	entryRepo copilotEntryRepo
	llmSvc    *LlmService
}

// NewCopilotService 建立新的 CopilotService
func NewCopilotService(repo CopilotRepo, entryRepo copilotEntryRepo, llmSvc *LlmService) *CopilotService {
	return &CopilotService{
		repo:      repo,
		entryRepo: entryRepo,
		llmSvc:    llmSvc,
	}
}

// CreateSession 建立新 session
func (s *CopilotService) CreateSession(ctx context.Context, userID string) (*model.CopilotSession, error) {
	return s.repo.CreateSession(ctx, userID)
}

// GetSession 取得 session（不存在回傳 ErrNotFound）
func (s *CopilotService) GetSession(ctx context.Context, id uuid.UUID) (*model.CopilotSession, error) {
	sess, err := s.repo.GetSession(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("session 不存在: %w", ErrNotFound)
	}
	return sess, nil
}

// DeleteSession 刪除 session
func (s *CopilotService) DeleteSession(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteSession(ctx, id); err != nil {
		return fmt.Errorf("session 不存在: %w", ErrNotFound)
	}
	return nil
}

// ListMessages 列出 session 所有歷史訊息
func (s *CopilotService) ListMessages(ctx context.Context, sessionID uuid.UUID) ([]model.CopilotMessage, error) {
	// 確認 session 存在
	if _, err := s.repo.GetSession(ctx, sessionID); err != nil {
		return nil, fmt.Errorf("session 不存在: %w", ErrNotFound)
	}
	return s.repo.ListMessages(ctx, sessionID)
}

// StartStream 儲存 user message，組裝 context，並回傳 msgID 供 SSE handler 使用
// 真正的 streaming 在 StreamChat 中執行
func (s *CopilotService) StartStream(ctx context.Context, sessionID uuid.UUID, content string) (uuid.UUID, error) {
	// 確認 session 存在
	if _, err := s.repo.GetSession(ctx, sessionID); err != nil {
		return uuid.Nil, fmt.Errorf("session 不存在: %w", ErrNotFound)
	}

	// 確認 LLM provider 可用
	if _, err := s.llmSvc.providerSvc.GetActiveProvider(ctx); err != nil {
		return uuid.Nil, ErrLLMUnavailable
	}

	// 取得下個 seq 並儲存 user message
	seq, err := s.repo.NextSeq(ctx, sessionID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("取得 seq 失敗: %w", err)
	}

	userMsg := &model.CopilotMessage{
		SessionID: sessionID,
		Role:      "user",
		Content:   content,
		Seq:       seq,
	}
	if err := s.repo.CreateMessage(ctx, userMsg); err != nil {
		return uuid.Nil, fmt.Errorf("儲存 user message 失敗: %w", err)
	}

	// 更新 session last_active
	_ = s.repo.TouchSession(ctx, sessionID)

	return userMsg.ID, nil
}

// StreamChat 對指定 session + msgID 執行 LLM streaming，將 SSE 事件逐一送到 ch
// 呼叫者負責關閉 ch（defer close(ch)）後等待本函式回傳
func (s *CopilotService) StreamChat(ctx context.Context, sessionID uuid.UUID, msgID uuid.UUID, ch chan<- StreamEvent) {
	// 取得 provider
	provider, err := s.llmSvc.providerSvc.GetActiveProvider(ctx)
	if err != nil {
		ch <- StreamEvent{Event: "error", Data: fmt.Sprintf(`{"code":"LLM_UNAVAILABLE","msg_id":"%s"}`, msgID)}
		return
	}

	// 解密 API key
	apiKey := ""
	if provider.ApiKey != nil && *provider.ApiKey != "" {
		decrypted, err := s.llmSvc.crypto.Decrypt(*provider.ApiKey)
		if err != nil {
			ch <- StreamEvent{Event: "error", Data: fmt.Sprintf(`{"code":"LLM_UNAVAILABLE","msg_id":"%s"}`, msgID)}
			return
		}
		apiKey = decrypted
	}
	cached := s.llmSvc.getOrCreateClient(provider, apiKey)

	// 組裝 LLM messages（system prompt + history + user message）
	messages, err := s.buildMessages(ctx, sessionID)
	if err != nil {
		ch <- StreamEvent{Event: "error", Data: fmt.Sprintf(`{"code":"INTERNAL_ERROR","msg_id":"%s"}`, msgID)}
		return
	}

	// 推送 message_start
	ch <- StreamEvent{
		Event: "message_start",
		Data:  fmt.Sprintf(`{"msg_id":"%s","session_id":"%s"}`, msgID, sessionID),
	}

	// 90 秒 streaming timeout
	streamCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	stream, err := cached.client.CreateChatCompletionStream(streamCtx, openai.ChatCompletionRequest{
		Model:    provider.ModelName,
		Messages: messages,
		Stream:   true,
	})
	if err != nil {
		ch <- StreamEvent{Event: "error", Data: fmt.Sprintf(`{"code":"LLM_UNAVAILABLE","msg_id":"%s"}`, msgID)}
		return
	}
	defer stream.Close()

	var (
		seq         = 1
		totalTokens = 0
		fullContent strings.Builder
		finishReason = "stop"
	)

	for {
		resp, err := stream.Recv()
		if err != nil {
			// 檢查是否為正常結束
			if isEOF(err) {
				break
			}
			// 檢查是否 timeout
			if errors.Is(streamCtx.Err(), context.DeadlineExceeded) {
				ch <- StreamEvent{Event: "error", Data: fmt.Sprintf(`{"code":"STREAM_TIMEOUT","msg_id":"%s"}`, msgID)}
				return
			}
			ch <- StreamEvent{Event: "error", Data: fmt.Sprintf(`{"code":"STREAM_ERROR","msg_id":"%s"}`, msgID)}
			return
		}

		if len(resp.Choices) == 0 {
			continue
		}

		delta := resp.Choices[0].Delta.Content
		if delta == "" {
			// 取得 finish_reason（若存在）
			if resp.Choices[0].FinishReason != "" {
				finishReason = string(resp.Choices[0].FinishReason)
			}
			continue
		}

		fullContent.WriteString(delta)
		totalTokens++

		// 推送 token，JSON 手動組裝避免轉義問題
		tokenJSON := buildTokenJSON(delta, msgID.String(), seq)
		ch <- StreamEvent{Event: "token", Data: tokenJSON}
		seq++
	}

	// 儲存 assistant message
	assistantContent := fullContent.String()
	if assistantContent != "" {
		nextSeq, err := s.repo.NextSeq(ctx, sessionID)
		if err == nil {
			assistantMsg := &model.CopilotMessage{
				SessionID: sessionID,
				Role:      "assistant",
				Content:   assistantContent,
				Seq:       nextSeq,
			}
			if err := s.repo.CreateMessage(ctx, assistantMsg); err != nil {
				slog.Error("儲存 assistant message 失敗", "error", err, "session_id", sessionID)
			}
		}
	}

	// 推送 message_done
	ch <- StreamEvent{
		Event: "message_done",
		Data:  fmt.Sprintf(`{"msg_id":"%s","total_tokens":%d,"finish_reason":"%s"}`, msgID, totalTokens, finishReason),
	}
}

// buildMessages 組裝 LLM 的完整 messages（system prompt + history + user message）
func (s *CopilotService) buildMessages(ctx context.Context, sessionID uuid.UUID) ([]openai.ChatCompletionMessage, error) {
	// 取得最近 10 輪對話（含剛儲存的 user message）
	history, err := s.repo.ListRecentMessages(ctx, sessionID, 10)
	if err != nil {
		return nil, fmt.Errorf("取得歷史訊息失敗: %w", err)
	}

	// 取得最後一則 user message 作為搜尋查詢
	query := ""
	for i := len(history) - 1; i >= 0; i-- {
		if history[i].Role == "user" {
			query = history[i].Content
			break
		}
	}

	// 語意搜尋 top-5 entries 組裝 system prompt
	systemPrompt := buildSystemPrompt(ctx, s.entryRepo, query)

	var messages []openai.ChatCompletionMessage
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: systemPrompt,
	})

	for _, msg := range history {
		role := openai.ChatMessageRoleUser
		if msg.Role == "assistant" {
			role = openai.ChatMessageRoleAssistant
		}
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    role,
			Content: msg.Content,
		})
	}

	return messages, nil
}

// buildSystemPrompt 組裝包含知識庫 entries 的 system prompt
func buildSystemPrompt(ctx context.Context, entryRepo copilotEntryRepo, query string) string {
	const basePrompt = "You are a knowledge assistant for the user's personal knowledge base."

	if query == "" || entryRepo == nil {
		return basePrompt
	}

	result, err := entryRepo.List(ctx, model.EntryFilter{
		Search:  query,
		Page:    1,
		PerPage: 5,
	})
	if err != nil || result == nil || len(result.Data) == 0 {
		return basePrompt
	}

	var sb strings.Builder
	sb.WriteString(basePrompt)
	sb.WriteString("\n\nRelevant entries from the knowledge base:\n")
	for _, e := range result.Data {
		if e.Title != nil {
			sb.WriteString("- ")
			sb.WriteString(*e.Title)
			if e.Summary != nil {
				sb.WriteString(": ")
				sb.WriteString(*e.Summary)
			}
			sb.WriteString("\n")
		}
	}
	sb.WriteString("\nUse these entries to provide accurate, context-aware responses.")
	return sb.String()
}

// buildTokenJSON 手動組裝 token SSE data JSON（避免特殊字元轉義問題）
func buildTokenJSON(token, msgID string, seq int) string {
	// 對 token 做基本 JSON 字串轉義
	escaped := strings.NewReplacer(
		`\`, `\\`,
		`"`, `\"`,
		"\n", `\n`,
		"\r", `\r`,
		"\t", `\t`,
	).Replace(token)
	return fmt.Sprintf(`{"token":"%s","msg_id":"%s","seq":%d}`, escaped, msgID, seq)
}

// isEOF 判斷是否為正常的 stream 結束
func isEOF(err error) bool {
	if err == nil {
		return false
	}
	return err.Error() == "EOF" || strings.Contains(err.Error(), "EOF")
}

// ErrNotFound session/message 不存在
var ErrNotFound = errors.New("not_found")

// ErrLLMUnavailable 無可用 LLM provider
var ErrLLMUnavailable = errors.New("LLM_UNAVAILABLE")

// compile-time check
var _ CopilotRepo = (*repository.CopilotRepository)(nil)
