package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CopilotRepository Copilot session + message CRUD
type CopilotRepository struct {
	pool *pgxpool.Pool
}

// NewCopilotRepository 建立新的 CopilotRepository
func NewCopilotRepository(pool *pgxpool.Pool) *CopilotRepository {
	return &CopilotRepository{pool: pool}
}

// CreateSession 建立新的 copilot session
func (r *CopilotRepository) CreateSession(ctx context.Context, userID string) (*model.CopilotSession, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO copilot_sessions (user_id) VALUES ($1)
		 RETURNING id, user_id, created_at, last_active`,
		userID,
	)
	var s model.CopilotSession
	if err := row.Scan(&s.ID, &s.UserID, &s.CreatedAt, &s.LastActive); err != nil {
		return nil, fmt.Errorf("建立 copilot session 失敗: %w", err)
	}
	return &s, nil
}

// GetSession 依 ID 取得 session
func (r *CopilotRepository) GetSession(ctx context.Context, id uuid.UUID) (*model.CopilotSession, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, user_id, created_at, last_active
		 FROM copilot_sessions WHERE id = $1`,
		id,
	)
	var s model.CopilotSession
	if err := row.Scan(&s.ID, &s.UserID, &s.CreatedAt, &s.LastActive); err != nil {
		return nil, fmt.Errorf("取得 copilot session 失敗: %w", err)
	}
	return &s, nil
}

// DeleteSession 刪除 session（cascade 刪除 messages）
func (r *CopilotRepository) DeleteSession(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM copilot_sessions WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("刪除 copilot session 失敗: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("session 不存在")
	}
	return nil
}

// TouchSession 更新 last_active 時間戳
func (r *CopilotRepository) TouchSession(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE copilot_sessions SET last_active = NOW() WHERE id = $1`,
		id,
	)
	return err
}

// NextSeq 取得 session 下一個 seq 編號（MAX(seq)+1，若無訊息則為 1）
func (r *CopilotRepository) NextSeq(ctx context.Context, sessionID uuid.UUID) (int, error) {
	var max *int
	err := r.pool.QueryRow(ctx,
		`SELECT MAX(seq) FROM copilot_messages WHERE session_id = $1`,
		sessionID,
	).Scan(&max)
	if err != nil {
		return 0, fmt.Errorf("查詢 max seq 失敗: %w", err)
	}
	if max == nil {
		return 1, nil
	}
	return *max + 1, nil
}

// CreateMessage 儲存一則訊息
func (r *CopilotRepository) CreateMessage(ctx context.Context, msg *model.CopilotMessage) error {
	return r.pool.QueryRow(ctx,
		`INSERT INTO copilot_messages (session_id, role, content, seq)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, created_at`,
		msg.SessionID, msg.Role, msg.Content, msg.Seq,
	).Scan(&msg.ID, &msg.CreatedAt)
}

// ListMessages 取得 session 所有訊息（依 seq 升冪）
func (r *CopilotRepository) ListMessages(ctx context.Context, sessionID uuid.UUID) ([]model.CopilotMessage, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, session_id, role, content, seq, created_at
		 FROM copilot_messages
		 WHERE session_id = $1
		 ORDER BY seq ASC`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("查詢訊息失敗: %w", err)
	}
	defer rows.Close()

	var msgs []model.CopilotMessage
	for rows.Next() {
		var m model.CopilotMessage
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.Seq, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("掃描訊息失敗: %w", err)
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

// ListRecentMessages 取得最近 N 輪（2N 則）訊息，用於 context 組裝
// 回傳依 seq 升冪排序（最舊在前，便於組裝 LLM messages slice）
func (r *CopilotRepository) ListRecentMessages(ctx context.Context, sessionID uuid.UUID, maxRounds int) ([]model.CopilotMessage, error) {
	limit := maxRounds * 2
	rows, err := r.pool.Query(ctx,
		`SELECT id, session_id, role, content, seq, created_at
		 FROM copilot_messages
		 WHERE session_id = $1
		 ORDER BY seq DESC
		 LIMIT $2`,
		sessionID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("查詢最近訊息失敗: %w", err)
	}
	defer rows.Close()

	var msgs []model.CopilotMessage
	for rows.Next() {
		var m model.CopilotMessage
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.Seq, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("掃描訊息失敗: %w", err)
		}
		msgs = append(msgs, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// 反轉為升冪（seq 小 → 大）
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}
