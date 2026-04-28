package model

import (
	"time"

	"github.com/google/uuid"
)

// LinkType entry_links 關聯類型
type LinkType string

const (
	LinkTypeDerivesFrom  LinkType = "derives_from"
	LinkTypeContradicts  LinkType = "contradicts"
	LinkTypeDuplicateOf  LinkType = "duplicate_of"
	LinkTypeReferences   LinkType = "references"
	LinkTypeSupersedes   LinkType = "supersedes"
	LinkTypeRelatedTo    LinkType = "related_to"
)

// ValidLinkTypes 合法的 link_type 值集合
var ValidLinkTypes = map[LinkType]bool{
	LinkTypeDerivesFrom: true,
	LinkTypeContradicts: true,
	LinkTypeDuplicateOf: true,
	LinkTypeReferences:  true,
	LinkTypeSupersedes:  true,
	LinkTypeRelatedTo:   true,
}

// LinkSource entry_links 建立來源
type LinkSource string

const (
	LinkSourceManual    LinkSource = "manual"
	LinkSourceLLM       LinkSource = "llm"
	LinkSourceAutoMerge LinkSource = "auto_merge"
)

// ValidLinkSources 合法的 source 值集合
var ValidLinkSources = map[LinkSource]bool{
	LinkSourceManual:    true,
	LinkSourceLLM:       true,
	LinkSourceAutoMerge: true,
}

// EntryLink 語意關聯資料庫模型
type EntryLink struct {
	ID         uuid.UUID  `json:"id"`
	FromID     uuid.UUID  `json:"from_id"`
	ToID       uuid.UUID  `json:"to_id"`
	LinkType   LinkType   `json:"link_type"`
	Relation   *string    `json:"relation"`
	Confidence float64    `json:"confidence"`
	Source     LinkSource `json:"source"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// ErrCodeSelfLink 自我關聯錯誤碼
const ErrCodeSelfLink = "SELF_LINK"

// ErrCodeDuplicateLink 重複關聯錯誤碼
const ErrCodeDuplicateLink = "DUPLICATE"
