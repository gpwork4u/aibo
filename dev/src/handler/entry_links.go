package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
)

// EntryLinksHandler entry_links HTTP handlers（F-044）
type EntryLinksHandler struct {
	repo *repository.EntryLinksRepository
}

// NewEntryLinksHandler 建立 EntryLinksHandler
func NewEntryLinksHandler(repo *repository.EntryLinksRepository) *EntryLinksHandler {
	return &EntryLinksHandler{repo: repo}
}

// writeLinkError 統一輸出 AppError
func writeLinkError(c *gin.Context, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		c.JSON(appErr.Status, dto.ErrorResponse{Code: appErr.Code, Message: appErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}

// parseLinkUUID 解析 path 中的 UUID 參數
func parseLinkUUID(c *gin.Context, key string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(key))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: key + " 必須為合法的 UUID",
		})
		return uuid.Nil, false
	}
	return id, true
}

// toLinkResponse 將 model.EntryLink 轉成 dto.EntryLinkResponse
func toLinkResponse(l *model.EntryLink) dto.EntryLinkResponse {
	return dto.EntryLinkResponse{
		ID:         l.ID,
		FromID:     l.FromID,
		ToID:       l.ToID,
		LinkType:   l.LinkType,
		Relation:   l.Relation,
		Confidence: l.Confidence,
		Source:     l.Source,
		CreatedAt:  l.CreatedAt,
		UpdatedAt:  l.UpdatedAt,
	}
}

// ListLinks GET /api/v1/entries/:id/links
// 回傳雙向關聯（outgoing + incoming）
func (h *EntryLinksHandler) ListLinks(c *gin.Context) {
	entryID, ok := parseLinkUUID(c, "id")
	if !ok {
		return
	}

	result, err := h.repo.ListBidirectional(c.Request.Context(), entryID)
	if err != nil {
		writeLinkError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// CreateLink POST /api/v1/entries/:id/links
func (h *EntryLinksHandler) CreateLink(c *gin.Context) {
	fromID, ok := parseLinkUUID(c, "id")
	if !ok {
		return
	}

	var req dto.CreateEntryLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	// self-link 檢查
	if fromID == req.ToID {
		c.JSON(http.StatusUnprocessableEntity, dto.ErrorResponse{
			Code:    model.ErrCodeSelfLink,
			Message: "不允許自我關聯",
		})
		return
	}

	// 預設值
	lt := model.LinkTypeRelatedTo
	if req.LinkType != nil {
		lt = *req.LinkType
		if !model.ValidLinkTypes[lt] {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "link_type 值不合法",
			})
			return
		}
	}

	source := model.LinkSourceManual
	if req.Source != nil {
		source = *req.Source
		if !model.ValidLinkSources[source] {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "source 值不合法",
			})
			return
		}
	}

	confidence := 1.0
	if req.Confidence != nil {
		if *req.Confidence < 0 || *req.Confidence > 1 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "confidence 必須在 0.0 ~ 1.0 之間",
			})
			return
		}
		confidence = *req.Confidence
	}

	link, err := h.repo.Create(c.Request.Context(), fromID, req.ToID, lt, req.Relation, confidence, source)
	if err != nil {
		writeLinkError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toLinkResponse(link))
}

// UpdateLink PATCH /api/v1/entries/links/:link_id
func (h *EntryLinksHandler) UpdateLink(c *gin.Context) {
	linkID, ok := parseLinkUUID(c, "link_id")
	if !ok {
		return
	}

	var req dto.UpdateEntryLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	// 驗證 link_type
	if req.LinkType != nil && !model.ValidLinkTypes[*req.LinkType] {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "link_type 值不合法",
		})
		return
	}

	// 驗證 confidence
	if req.Confidence != nil && (*req.Confidence < 0 || *req.Confidence > 1) {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "confidence 必須在 0.0 ~ 1.0 之間",
		})
		return
	}

	link, err := h.repo.Update(c.Request.Context(), linkID, req)
	if err != nil {
		writeLinkError(c, err)
		return
	}
	c.JSON(http.StatusOK, toLinkResponse(link))
}

// DeleteLink DELETE /api/v1/entries/links/:link_id
func (h *EntryLinksHandler) DeleteLink(c *gin.Context) {
	linkID, ok := parseLinkUUID(c, "link_id")
	if !ok {
		return
	}

	if err := h.repo.Delete(c.Request.Context(), linkID); err != nil {
		writeLinkError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GetGraph GET /api/v1/graph?entry_id=...
// 回傳指定 entry 所有關聯的扁平列表（供 F-045 前端圖形視覺化使用）
func (h *EntryLinksHandler) GetGraph(c *gin.Context) {
	entryIDStr := c.Query("entry_id")
	if entryIDStr == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "entry_id 為必填參數",
		})
		return
	}
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "entry_id 必須為合法的 UUID",
		})
		return
	}

	links, err := h.repo.ListByEntryForGraph(c.Request.Context(), entryID)
	if err != nil {
		writeLinkError(c, err)
		return
	}

	resp := make([]dto.EntryLinkResponse, 0, len(links))
	for i := range links {
		resp = append(resp, toLinkResponse(&links[i]))
	}
	c.JSON(http.StatusOK, gin.H{"entry_id": entryID, "links": resp})
}
