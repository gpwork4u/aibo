package repository

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EntryLinksRepository entry_links 資料庫操作（F-044）
type EntryLinksRepository struct {
	pool *pgxpool.Pool
}

// NewEntryLinksRepository 建立新的 EntryLinksRepository
func NewEntryLinksRepository(pool *pgxpool.Pool) *EntryLinksRepository {
	return &EntryLinksRepository{pool: pool}
}

// mapLinkPgErr 將常見 PgError 轉成 AppError
func mapLinkPgErr(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			return model.NewAppError(http.StatusConflict, model.ErrCodeDuplicateLink, "相同的關聯已存在")
		case "23503": // foreign_key_violation
			return model.NewAppError(http.StatusNotFound, model.ErrCodeNotFound, "指定的 entry 不存在")
		case "23514": // check_violation
			return model.NewAppError(http.StatusBadRequest, model.ErrCodeInvalidInput, "欄位值不符合限制")
		}
	}
	return err
}

// Create 建立新的 entry_link，回傳建立後的完整記錄
func (r *EntryLinksRepository) Create(ctx context.Context, fromID, toID uuid.UUID, lt model.LinkType, relation *string, confidence float64, source model.LinkSource) (*model.EntryLink, error) {
	link := &model.EntryLink{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO entry_links (from_id, to_id, link_type, relation, confidence, source)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, from_id, to_id, link_type, relation, confidence, source, created_at, updated_at
	`, fromID, toID, string(lt), relation, confidence, string(source)).Scan(
		&link.ID, &link.FromID, &link.ToID, &link.LinkType, &link.Relation,
		&link.Confidence, &link.Source, &link.CreatedAt, &link.UpdatedAt,
	)
	if err != nil {
		return nil, mapLinkPgErr(err)
	}
	return link, nil
}

// ListBidirectional 雙向查詢：傳回指定 entry 的 outgoing + incoming
func (r *EntryLinksRepository) ListBidirectional(ctx context.Context, entryID uuid.UUID) (*dto.EntryLinksResponse, error) {
	// outgoing: from_id = entryID，JOIN to_id entry
	outRows, err := r.pool.Query(ctx, `
		SELECT el.id, el.link_type, el.relation, el.confidence, el.source, el.created_at,
		       e.id, e.title, e.summary
		FROM entry_links el
		JOIN entries e ON e.id = el.to_id
		WHERE el.from_id = $1
		ORDER BY el.created_at DESC
	`, entryID)
	if err != nil {
		return nil, err
	}
	defer outRows.Close()

	outgoing := make([]dto.OutgoingLinkDTO, 0)
	for outRows.Next() {
		var d dto.OutgoingLinkDTO
		err := outRows.Scan(
			&d.ID, &d.LinkType, &d.Relation, &d.Confidence, &d.Source, &d.CreatedAt,
			&d.ToEntry.ID, &d.ToEntry.Title, &d.ToEntry.Summary,
		)
		if err != nil {
			return nil, err
		}
		outgoing = append(outgoing, d)
	}
	if err := outRows.Err(); err != nil {
		return nil, err
	}

	// incoming: to_id = entryID，JOIN from_id entry
	inRows, err := r.pool.Query(ctx, `
		SELECT el.id, el.link_type, el.relation, el.confidence, el.source, el.created_at,
		       e.id, e.title, e.summary
		FROM entry_links el
		JOIN entries e ON e.id = el.from_id
		WHERE el.to_id = $1
		ORDER BY el.created_at DESC
	`, entryID)
	if err != nil {
		return nil, err
	}
	defer inRows.Close()

	incoming := make([]dto.IncomingLinkDTO, 0)
	for inRows.Next() {
		var d dto.IncomingLinkDTO
		err := inRows.Scan(
			&d.ID, &d.LinkType, &d.Relation, &d.Confidence, &d.Source, &d.CreatedAt,
			&d.FromEntry.ID, &d.FromEntry.Title, &d.FromEntry.Summary,
		)
		if err != nil {
			return nil, err
		}
		incoming = append(incoming, d)
	}
	if err := inRows.Err(); err != nil {
		return nil, err
	}

	return &dto.EntryLinksResponse{
		Outgoing: outgoing,
		Incoming: incoming,
	}, nil
}

// GetByID 取得單筆 link
func (r *EntryLinksRepository) GetByID(ctx context.Context, linkID uuid.UUID) (*model.EntryLink, error) {
	link := &model.EntryLink{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, from_id, to_id, link_type, relation, confidence, source, created_at, updated_at
		FROM entry_links WHERE id = $1
	`, linkID).Scan(
		&link.ID, &link.FromID, &link.ToID, &link.LinkType, &link.Relation,
		&link.Confidence, &link.Source, &link.CreatedAt, &link.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, model.NewAppError(http.StatusNotFound, model.ErrCodeNotFound, "關聯不存在")
	}
	if err != nil {
		return nil, err
	}
	return link, nil
}

// Update 部分更新 link（link_type / relation / confidence）
func (r *EntryLinksRepository) Update(ctx context.Context, linkID uuid.UUID, req dto.UpdateEntryLinkRequest) (*model.EntryLink, error) {
	link, err := r.GetByID(ctx, linkID)
	if err != nil {
		return nil, err
	}

	if req.LinkType != nil {
		link.LinkType = *req.LinkType
	}
	if req.Relation != nil {
		link.Relation = req.Relation
	}
	if req.Confidence != nil {
		link.Confidence = *req.Confidence
	}

	updated := &model.EntryLink{}
	err = r.pool.QueryRow(ctx, `
		UPDATE entry_links
		SET link_type = $1, relation = $2, confidence = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING id, from_id, to_id, link_type, relation, confidence, source, created_at, updated_at
	`, string(link.LinkType), link.Relation, link.Confidence, linkID).Scan(
		&updated.ID, &updated.FromID, &updated.ToID, &updated.LinkType, &updated.Relation,
		&updated.Confidence, &updated.Source, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err != nil {
		return nil, mapLinkPgErr(err)
	}
	return updated, nil
}

// Delete 刪除 link，若不存在回傳 404
func (r *EntryLinksRepository) Delete(ctx context.Context, linkID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM entry_links WHERE id = $1`, linkID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.NewAppError(http.StatusNotFound, model.ErrCodeNotFound, "關聯不存在")
	}
	return nil
}

// ListByEntryForGraph 取得指定 entry 的所有關聯（for graph endpoint）
func (r *EntryLinksRepository) ListByEntryForGraph(ctx context.Context, entryID uuid.UUID) ([]model.EntryLink, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, from_id, to_id, link_type, relation, confidence, source, created_at, updated_at
		FROM entry_links
		WHERE from_id = $1 OR to_id = $1
		ORDER BY created_at DESC
	`, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	links := make([]model.EntryLink, 0)
	for rows.Next() {
		var l model.EntryLink
		err := rows.Scan(
			&l.ID, &l.FromID, &l.ToID, &l.LinkType, &l.Relation,
			&l.Confidence, &l.Source, &l.CreatedAt, &l.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	return links, rows.Err()
}
