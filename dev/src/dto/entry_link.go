package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
)

// CreateEntryLinkRequest 建立關聯的請求 body
type CreateEntryLinkRequest struct {
	ToID       uuid.UUID        `json:"to_id"`
	LinkType   *model.LinkType  `json:"link_type"`   // 預設 related_to
	Relation   *string          `json:"relation"`
	Confidence *float64         `json:"confidence"`  // 預設 1.0（manual）
	Source     *model.LinkSource `json:"source"`     // 預設 manual
}

// UpdateEntryLinkRequest PATCH /entries/links/:link_id 請求 body（部分更新）
type UpdateEntryLinkRequest struct {
	LinkType   *model.LinkType  `json:"link_type"`
	Relation   *string          `json:"relation"`
	Confidence *float64         `json:"confidence"`
}

// EntryRefDTO 關聯中的對端 entry 簡要資訊
type EntryRefDTO struct {
	ID      uuid.UUID `json:"id"`
	Title   *string   `json:"title"`
	Summary *string   `json:"summary"`
}

// OutgoingLinkDTO 向外關聯（from_id == 當前 entry）
type OutgoingLinkDTO struct {
	ID         uuid.UUID      `json:"id"`
	ToEntry    EntryRefDTO    `json:"to_entry"`
	LinkType   model.LinkType `json:"link_type"`
	Relation   *string        `json:"relation"`
	Confidence float64        `json:"confidence"`
	Source     model.LinkSource `json:"source"`
	CreatedAt  time.Time      `json:"created_at"`
}

// IncomingLinkDTO 向內關聯（to_id == 當前 entry）
type IncomingLinkDTO struct {
	ID         uuid.UUID      `json:"id"`
	FromEntry  EntryRefDTO    `json:"from_entry"`
	LinkType   model.LinkType `json:"link_type"`
	Relation   *string        `json:"relation"`
	Confidence float64        `json:"confidence"`
	Source     model.LinkSource `json:"source"`
	CreatedAt  time.Time      `json:"created_at"`
}

// EntryLinksResponse GET /entries/:id/links 回應
type EntryLinksResponse struct {
	Outgoing []OutgoingLinkDTO `json:"outgoing"`
	Incoming []IncomingLinkDTO `json:"incoming"`
}

// EntryLinkResponse 單筆關聯回應（POST / PATCH 回應）
type EntryLinkResponse struct {
	ID         uuid.UUID        `json:"id"`
	FromID     uuid.UUID        `json:"from_id"`
	ToID       uuid.UUID        `json:"to_id"`
	LinkType   model.LinkType   `json:"link_type"`
	Relation   *string          `json:"relation"`
	Confidence float64          `json:"confidence"`
	Source     model.LinkSource `json:"source"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}
