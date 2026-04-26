package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/sashabaranov/go-openai"
)

// JournalDraftService F-028c：依當日 entries + gcal events 由 LLM 生成日記草稿。
//
// 不直接寫入 DB；呼叫端拿到 draft 後讓使用者編輯，再透過 PATCH /journal/:date 落地。
type JournalDraftService struct {
	llmSvc      *LlmService
	entryRepo   EntryRepository
	gcalSvc     *GcalService // optional：gcal 未連時跳過
	maxContent  int          // entries 內容 char 上限（避免 prompt 爆量）
	timeoutSecs int          // 預設 60s
}

// NewJournalDraftService 建立 JournalDraftService。
func NewJournalDraftService(llmSvc *LlmService, entryRepo EntryRepository, gcalSvc *GcalService) *JournalDraftService {
	return &JournalDraftService{
		llmSvc:      llmSvc,
		entryRepo:   entryRepo,
		gcalSvc:     gcalSvc,
		maxContent:  4000,
		timeoutSecs: 60,
	}
}

// JournalDraftResult LLM 回傳結果（直接帶 markdown）。
type JournalDraftResult struct {
	Draft     string   `json:"draft"`
	UsedRefs  []string `json:"used_refs,omitempty"` // 來源 entry IDs / event IDs（用於前端 source-refs panel）
	Mood      string   `json:"mood,omitempty"`      // optional 推測情緒
	GeneratedBy string `json:"generated_by"`
}

// Draft 為指定日期生成日記草稿。
//
// 流程：
//  1. 依 tz 撈當日 entries（透過 EntryRepository.ListByDateRange）
//  2. 嘗試讀 gcal events（未連 / 上游錯時跳過，不阻擋整體）
//  3. 組 prompt 呼叫 LLM
//  4. 解析回應 markdown → JournalDraftResult
//
// 錯誤：
//   - 400 INVALID_INPUT：date / tz 格式錯
//   - 404 NO_DATA：當日無 entries 也無 events，無法生成
//   - 424 LLM_NOT_CONFIGURED：未設 default LLM provider
//   - 502 LLM_UPSTREAM_ERROR：LLM 呼叫失敗
func (s *JournalDraftService) Draft(ctx context.Context, dateStr, tz, calendarID string) (*JournalDraftResult, error) {
	if _, err := parseJournalDate(dateStr, tz); err != nil {
		return nil, err
	}

	entries, err := s.entryRepo.ListByDateRange(ctx, dateStr, dateStr, tz)
	if err != nil {
		return nil, fmt.Errorf("查詢當日 entries 失敗: %w", err)
	}

	// gcal events（best-effort）
	var events []*gcalEventLike
	if s.gcalSvc != nil {
		evs, err := s.fetchGcalEventsForDate(ctx, dateStr, tz, calendarID)
		if err != nil {
			slog.Warn("draft: 取 gcal events 失敗，跳過", "error", err)
		} else {
			events = evs
		}
	}

	if len(entries) == 0 && len(events) == 0 {
		return nil, model.NewAppError(404, model.ErrCodeNotFound, "當日無可參考素材，無法生成日記草稿")
	}

	prompt := s.buildPrompt(dateStr, entries, events)

	// 呼叫 LLM（使用 chat completion；非 streaming，依 spec/tech-survey 決策）
	provider, err := s.llmSvc.providerSvc.GetActiveProvider(ctx)
	if err != nil {
		return nil, model.NewAppError(424, "LLM_NOT_CONFIGURED", "尚未設定可用的 LLM provider，無法生成日記草稿")
	}
	apiKey := ""
	if provider.ApiKey != nil && *provider.ApiKey != "" {
		decrypted, decErr := s.llmSvc.crypto.Decrypt(*provider.ApiKey)
		if decErr != nil {
			return nil, fmt.Errorf("解密 LLM API key 失敗: %w", decErr)
		}
		apiKey = decrypted
	}
	cached := s.llmSvc.getOrCreateClient(provider, apiKey)

	timeout := time.Duration(s.timeoutSecs) * time.Second
	if provider.Config != nil {
		var cfg model.LlmProviderConfig
		if err := json.Unmarshal(*provider.Config, &cfg); err == nil && cfg.TimeoutSeconds != nil {
			timeout = time.Duration(*cfg.TimeoutSeconds) * time.Second
		}
	}
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	if err := cached.limiter.Wait(callCtx); err != nil {
		return nil, fmt.Errorf("rate limit 等待取消: %w", err)
	}

	slog.Info("呼叫 LLM 生成日記草稿", "provider", provider.Name, "model", provider.ModelName, "date", dateStr)
	resp, err := cached.client.CreateChatCompletion(callCtx, openai.ChatCompletionRequest{
		Model: provider.ModelName,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: journalDraftSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
	})
	if err != nil {
		return nil, model.NewAppError(502, "LLM_UPSTREAM_ERROR", "LLM 服務暫時無法使用："+err.Error())
	}
	if len(resp.Choices) == 0 {
		return nil, model.NewAppError(502, "LLM_UPSTREAM_ERROR", "LLM 回傳空結果")
	}

	raw := resp.Choices[0].Message.Content
	var parsed JournalDraftResult
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		slog.Error("LLM 日記草稿格式解析失敗", "raw", raw, "error", err)
		// fallback：把原 content 視為 draft（LLM 沒按 JSON）
		parsed.Draft = strings.TrimSpace(raw)
	}
	parsed.GeneratedBy = provider.Name + "/" + provider.ModelName
	return &parsed, nil
}

// gcalEventLike 內部表示，避免引入 calendar/v3 強耦合
type gcalEventLike struct {
	ID      string
	Summary string
	Start   string
	End     string
	AllDay  bool
}

func (s *JournalDraftService) fetchGcalEventsForDate(ctx context.Context, dateStr, tz, calendarID string) ([]*gcalEventLike, error) {
	if s.gcalSvc == nil {
		return nil, nil
	}
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return nil, err
	}
	d, err := time.ParseInLocation("2006-01-02", dateStr, loc)
	if err != nil {
		return nil, err
	}
	if calendarID == "" {
		calendarID = "primary"
	}
	startUTC := d.UTC()
	endUTC := d.AddDate(0, 0, 1).UTC()
	connected, _ := s.gcalSvc.IsConnected(ctx)
	if !connected {
		return nil, nil
	}
	events, err := s.gcalSvc.ListEvents(ctx, calendarID, startUTC, endUTC, true)
	if err != nil {
		return nil, err
	}
	out := make([]*gcalEventLike, 0, len(events))
	for _, ev := range events {
		if ev == nil {
			continue
		}
		gel := &gcalEventLike{
			ID:      ev.Id,
			Summary: ev.Summary,
		}
		if ev.Start != nil {
			if ev.Start.DateTime != "" {
				gel.Start = ev.Start.DateTime
			} else if ev.Start.Date != "" {
				gel.Start = ev.Start.Date
				gel.AllDay = true
			}
		}
		if ev.End != nil {
			if ev.End.DateTime != "" {
				gel.End = ev.End.DateTime
			} else if ev.End.Date != "" {
				gel.End = ev.End.Date
			}
		}
		out = append(out, gel)
	}
	return out, nil
}

// buildPrompt 將當日素材組成 prompt（截斷過長 entry 內容防止 prompt 爆量）。
func (s *JournalDraftService) buildPrompt(date string, entries []dto.CalendarEntrySummary, events []*gcalEventLike) string {
	var b strings.Builder
	fmt.Fprintf(&b, "請根據下列素材，為日期 %s 撰寫一篇日記草稿。\n\n", date)

	if len(entries) > 0 {
		b.WriteString("## 知識條目\n")
		for _, e := range entries {
			title := "(無標題)"
			if e.Title != nil && *e.Title != "" {
				title = *e.Title
			}
			summary := ""
			if e.Summary != nil {
				summary = *e.Summary
			}
			line := fmt.Sprintf("- [%s] %s — %s", e.ID, title, summary)
			if len(line) > s.maxContent/4 {
				line = line[:s.maxContent/4] + "…"
			}
			b.WriteString(line)
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	if len(events) > 0 {
		b.WriteString("## Google Calendar 事件\n")
		for _, ev := range events {
			fmt.Fprintf(&b, "- [%s] %s（%s ~ %s）\n", ev.ID, ev.Summary, ev.Start, ev.End)
		}
		b.WriteString("\n")
	}

	full := b.String()
	if len(full) > s.maxContent {
		full = full[:s.maxContent] + "\n…(已截斷)"
	}
	return full
}

const journalDraftSystemPrompt = `你是一位日記整理助手。

我會給你某一天的素材（可能包含「知識條目」、「Google Calendar 事件」、「GitHub 推送」、「LLM 對話紀錄」），
請以**條列式 markdown** 整理成一篇日記，方便日後快速回顧。

格式要求：
- 用 ## 區塊標題分類（例如「## 知識條目」「## 行事曆」「## GitHub」「## LLM 對話」），只顯示有素材的區塊
- 每個區塊用 bullet (- ) 條列；每條一句話精簡描述
- 條目可附帶簡短重點 (- **標題** — 重點)；事件附時間
- 結尾加「## 一日回顧」用 1-2 行白話摘要當日整體方向（例如「今天主要在處理 X，穿插討論 Y」）
- 沒有素材的區塊就完全省略
- 不要捏造未提供的細節
- 不要寫「根據 entry XX」這種引用文字

請以嚴格的 JSON 格式回應：
{
  "draft": "## 知識條目\n- **A** — ...\n- **B** — ...\n\n## 行事曆\n- 09:00 開會\n\n## 一日回顧\n今天...",
  "used_refs": ["<entry_id_1>", "<gcal_id_1>"],
  "mood": "calm|energetic|focused|tired|reflective|（自由文字，可省略）"
}

只回傳 JSON，不要包含任何其他文字、說明或 markdown 程式碼框。`
