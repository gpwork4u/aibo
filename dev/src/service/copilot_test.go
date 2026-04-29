package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
)

// --- mock CopilotRepo ---

type mockCopilotRepo struct {
	sessions map[uuid.UUID]*model.CopilotSession
	messages []model.CopilotMessage
	nextSeq  int
}

func newMockCopilotRepo() *mockCopilotRepo {
	return &mockCopilotRepo{
		sessions: make(map[uuid.UUID]*model.CopilotSession),
		nextSeq:  1,
	}
}

func (m *mockCopilotRepo) CreateSession(_ context.Context, userID string) (*model.CopilotSession, error) {
	s := &model.CopilotSession{
		ID:         uuid.New(),
		UserID:     userID,
		CreatedAt:  time.Now(),
		LastActive: time.Now(),
	}
	m.sessions[s.ID] = s
	return s, nil
}

func (m *mockCopilotRepo) GetSession(_ context.Context, id uuid.UUID) (*model.CopilotSession, error) {
	s, ok := m.sessions[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return s, nil
}

func (m *mockCopilotRepo) DeleteSession(_ context.Context, id uuid.UUID) error {
	if _, ok := m.sessions[id]; !ok {
		return errors.New("not found")
	}
	delete(m.sessions, id)
	return nil
}

func (m *mockCopilotRepo) TouchSession(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (m *mockCopilotRepo) NextSeq(_ context.Context, _ uuid.UUID) (int, error) {
	seq := m.nextSeq
	m.nextSeq++
	return seq, nil
}

func (m *mockCopilotRepo) CreateMessage(_ context.Context, msg *model.CopilotMessage) error {
	msg.ID = uuid.New()
	msg.CreatedAt = time.Now()
	m.messages = append(m.messages, *msg)
	return nil
}

func (m *mockCopilotRepo) ListMessages(_ context.Context, sessionID uuid.UUID) ([]model.CopilotMessage, error) {
	var result []model.CopilotMessage
	for _, msg := range m.messages {
		if msg.SessionID == sessionID {
			result = append(result, msg)
		}
	}
	return result, nil
}

func (m *mockCopilotRepo) ListRecentMessages(_ context.Context, sessionID uuid.UUID, maxRounds int) ([]model.CopilotMessage, error) {
	var all []model.CopilotMessage
	for _, msg := range m.messages {
		if msg.SessionID == sessionID {
			all = append(all, msg)
		}
	}
	limit := maxRounds * 2
	if len(all) > limit {
		all = all[len(all)-limit:]
	}
	return all, nil
}

// --- mock entryRepo ---

type mockEntryRepo struct {
	data []model.EntryListItem
}

func (m *mockEntryRepo) List(_ context.Context, _ model.EntryFilter) (*model.EntryListResult, error) {
	return &model.EntryListResult{Data: m.data}, nil
}

// --- Tests ---

func TestCopilotService_CreateSession(t *testing.T) {
	repo := newMockCopilotRepo()
	svc := NewCopilotService(repo, nil, nil)

	sess, err := svc.CreateSession(context.Background(), "admin")
	if err != nil {
		t.Fatalf("建立 session 失敗: %v", err)
	}
	if sess.ID == uuid.Nil {
		t.Error("session ID 不應為空")
	}
	if sess.UserID != "admin" {
		t.Errorf("user_id 期望 admin，得到 %s", sess.UserID)
	}
}

func TestCopilotService_DeleteSession_NotFound(t *testing.T) {
	repo := newMockCopilotRepo()
	svc := NewCopilotService(repo, nil, nil)

	err := svc.DeleteSession(context.Background(), uuid.New())
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("期望 ErrNotFound，得到 %v", err)
	}
}

func TestCopilotService_ListMessages_NotFound(t *testing.T) {
	repo := newMockCopilotRepo()
	svc := NewCopilotService(repo, nil, nil)

	_, err := svc.ListMessages(context.Background(), uuid.New())
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("期望 ErrNotFound，得到 %v", err)
	}
}

func TestCopilotService_ListMessages_Success(t *testing.T) {
	repo := newMockCopilotRepo()
	svc := NewCopilotService(repo, nil, nil)

	sess, _ := svc.CreateSession(context.Background(), "admin")

	// 插入 4 則訊息
	for i := 0; i < 4; i++ {
		msg := &model.CopilotMessage{
			SessionID: sess.ID,
			Role:      "user",
			Content:   "msg",
			Seq:       i + 1,
		}
		_ = repo.CreateMessage(context.Background(), msg)
	}

	msgs, err := svc.ListMessages(context.Background(), sess.ID)
	if err != nil {
		t.Fatalf("ListMessages 失敗: %v", err)
	}
	if len(msgs) != 4 {
		t.Errorf("期望 4 則訊息，得到 %d", len(msgs))
	}
}

// TestBuildSystemPrompt_WithEntries 驗證 context 注入邏輯
func TestBuildSystemPrompt_WithEntries(t *testing.T) {
	title := "Test Driven Development Basics"
	summary := "TDD 是一種開發流程"
	entryRepo := &mockEntryRepo{
		data: []model.EntryListItem{
			{Title: &title, Summary: &summary},
		},
	}

	prompt := buildSystemPrompt(context.Background(), entryRepo, "Explain TDD")

	if !strings.Contains(prompt, title) {
		t.Errorf("system prompt 應包含 entry title：%s", title)
	}
	if !strings.Contains(prompt, summary) {
		t.Errorf("system prompt 應包含 entry summary：%s", summary)
	}
}

// TestBuildSystemPrompt_EmptyQuery 查詢為空時回傳基本 prompt
func TestBuildSystemPrompt_EmptyQuery(t *testing.T) {
	prompt := buildSystemPrompt(context.Background(), nil, "")
	if prompt == "" {
		t.Error("prompt 不應為空")
	}
	if strings.Contains(prompt, "Relevant entries") {
		t.Error("空查詢不應包含 entries 段落")
	}
}

// TestListRecentMessages_TruncatesTo10Rounds 驗證 10 輪截斷邏輯
func TestListRecentMessages_TruncatesTo10Rounds(t *testing.T) {
	repo := newMockCopilotRepo()
	sessID := uuid.New()

	// 插入 22 則訊息（11 輪）
	for i := 1; i <= 22; i++ {
		role := "user"
		if i%2 == 0 {
			role = "assistant"
		}
		msg := &model.CopilotMessage{
			SessionID: sessID,
			Role:      role,
			Content:   "msg",
			Seq:       i,
		}
		_ = repo.CreateMessage(context.Background(), msg)
	}

	// ListRecentMessages 最多 10 輪 = 20 則
	msgs, err := repo.ListRecentMessages(context.Background(), sessID, 10)
	if err != nil {
		t.Fatalf("ListRecentMessages 失敗: %v", err)
	}
	if len(msgs) > 20 {
		t.Errorf("期望最多 20 則，得到 %d", len(msgs))
	}

	// 驗證 DB 仍保留全部 22 則
	allMsgs, _ := repo.ListMessages(context.Background(), sessID)
	if len(allMsgs) != 22 {
		t.Errorf("DB 應保留 22 則，得到 %d", len(allMsgs))
	}
}

// TestBuildTokenJSON_EscapesQuotes 驗證特殊字元轉義
func TestBuildTokenJSON_EscapesQuotes(t *testing.T) {
	json := buildTokenJSON(`say "hello"`, "msg-001", 1)
	if !strings.Contains(json, `\"hello\"`) {
		t.Errorf("雙引號應被轉義，JSON: %s", json)
	}
}
