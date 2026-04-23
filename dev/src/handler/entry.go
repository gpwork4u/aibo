package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// EntryHandler 知識條目 HTTP handlers
type EntryHandler struct {
	svc              *service.EntryService
	classifierWorker *service.ClassifierWorker
}

// NewEntryHandler 建立新的 EntryHandler
func NewEntryHandler(svc *service.EntryService, classifierWorker *service.ClassifierWorker) *EntryHandler {
	return &EntryHandler{svc: svc, classifierWorker: classifierWorker}
}

// Create 建立新知識條目
// POST /api/v1/entries
func (h *EntryHandler) Create(c *gin.Context) {
	var req dto.CreateEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	entry, err := h.svc.Create(
		c.Request.Context(),
		req.Title, req.Content, req.CategoryID,
		req.Source, req.SourceType, req.SourceRef,
		req.Tags, req.Domains, req.Context,
	)
	if err != nil {
		handleEntryError(c, err)
		return
	}

	// 建立成功後，如果沒有指定 category，觸發背景 LLM 自動分類
	if entry.CategoryID == nil && h.classifierWorker != nil {
		h.classifierWorker.Enqueue(entry.ID)
	}

	c.JSON(http.StatusCreated, toEntryResponse(entry))
}

// List 列表查詢知識條目
// GET /api/v1/entries
func (h *EntryHandler) List(c *gin.Context) {
	filter := model.EntryFilter{}

	// 解析分頁參數
	if pageStr := c.Query("page"); pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "page 必須為正整數",
			})
			return
		}
		filter.Page = page
	} else {
		filter.Page = 1
	}

	if perPageStr := c.Query("per_page"); perPageStr != "" {
		perPage, err := strconv.Atoi(perPageStr)
		if err != nil || perPage < 1 || perPage > 100 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "per_page 必須為 1-100 的整數",
			})
			return
		}
		filter.PerPage = perPage
	} else {
		filter.PerPage = 20
	}

	// 解析 category_id（支援 "null" 字串）
	if catID := c.Query("category_id"); catID != "" {
		filter.CategoryID = &catID
	}

	// 解析 tag（可多個，AND 邏輯）
	filter.Tags = c.QueryArray("tag")

	// 解析 domain（可多個，AND 邏輯）
	filter.Domains = c.QueryArray("domain")

	// 解析 context.* 過濾參數
	contextFilter := make(map[string][]string)
	for key, values := range c.Request.URL.Query() {
		if strings.HasPrefix(key, "context.") {
			subKey := strings.TrimPrefix(key, "context.")
			if subKey != "" {
				contextFilter[subKey] = values
			}
		}
	}
	if len(contextFilter) > 0 {
		filter.ContextFilter = contextFilter
	}

	// 解析 is_archived
	if archivedStr := c.Query("is_archived"); archivedStr != "" {
		archived, err := strconv.ParseBool(archivedStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "is_archived 必須為 true 或 false",
			})
			return
		}
		filter.IsArchived = &archived
	}

	// 解析 lifecycle_status
	if ls := c.Query("lifecycle_status"); ls != "" {
		validStatuses := map[string]bool{"active": true, "superseded": true, "degraded": true}
		if !validStatuses[ls] {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "lifecycle_status 必須為 active、superseded 或 degraded",
			})
			return
		}
		filter.LifecycleStatus = ls
	}

	// 解析搜尋和排序
	filter.Search = c.Query("search")
	filter.Sort = c.Query("sort")
	filter.Order = c.Query("order")

	result, err := h.svc.List(c.Request.Context(), filter)
	if err != nil {
		handleEntryError(c, err)
		return
	}

	// 轉換為 DTO
	items := make([]dto.EntryListItemResponse, 0, len(result.Data))
	for _, item := range result.Data {
		tags := item.Tags
		if tags == nil {
			tags = []string{}
		}
		domains := item.Domains
		if domains == nil {
			domains = []string{}
		}
		items = append(items, dto.EntryListItemResponse{
			ID:              item.ID,
			Title:           item.Title,
			Summary:         item.Summary,
			ContentPreview:  item.ContentPreview,
			CategoryID:      item.CategoryID,
			Tags:            tags,
			Domains:         domains,
			Context:         item.Context,
			IsArchived:      item.IsArchived,
			Confidence:      item.Confidence,
			Confirmations:   item.Confirmations,
			FlagsCount:      item.FlagsCount,
			SupersededBy:    item.SupersededBy,
			LifecycleStatus: item.LifecycleStatus(),
			CreatedAt:       item.CreatedAt,
			UpdatedAt:       item.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, dto.ListEntriesResponse{
		Data: items,
		Pagination: dto.PaginationResponse{
			Page:       result.Pagination.Page,
			PerPage:    result.Pagination.PerPage,
			Total:      result.Pagination.Total,
			TotalPages: result.Pagination.TotalPages,
		},
	})
}

// GetByID 取得單筆知識條目
// GET /api/v1/entries/:id
func (h *EntryHandler) GetByID(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	entry, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		handleEntryError(c, err)
		return
	}

	c.JSON(http.StatusOK, toEntryResponse(entry))
}

// Update 部分更新知識條目（PATCH）
// PATCH /api/v1/entries/:id
func (h *EntryHandler) Update(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	// 讀取原始 JSON body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "無法讀取請求內容",
		})
		return
	}

	// 解析為 map 以判斷哪些欄位有傳入
	var rawMap map[string]json.RawMessage
	if err := json.Unmarshal(body, &rawMap); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	// 空 body {} 回 400
	if len(rawMap) == 0 {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請至少提供一個要更新的欄位",
		})
		return
	}

	updates := make(map[string]interface{})

	// 解析各欄位
	if v, ok := rawMap["title"]; ok {
		if string(v) == "null" {
			updates["title"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "title 格式錯誤",
				})
				return
			}
			updates["title"] = s
		}
	}

	if v, ok := rawMap["content"]; ok {
		if string(v) == "null" {
			updates["content"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "content 格式錯誤",
				})
				return
			}
			updates["content"] = s
		}
	}

	if v, ok := rawMap["category_id"]; ok {
		if string(v) == "null" {
			updates["category_id"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "category_id 格式錯誤",
				})
				return
			}
			catID, err := uuid.Parse(s)
			if err != nil {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "無效的 category_id 格式",
				})
				return
			}
			updates["category_id"] = catID
		}
	}

	if v, ok := rawMap["source"]; ok {
		if string(v) == "null" {
			updates["source"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err == nil {
				updates["source"] = s
			}
		}
	}

	if v, ok := rawMap["source_type"]; ok {
		if string(v) == "null" {
			updates["source_type"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err == nil {
				updates["source_type"] = s
			}
		}
	}

	if v, ok := rawMap["source_ref"]; ok {
		if string(v) == "null" {
			updates["source_ref"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err == nil {
				updates["source_ref"] = s
			}
		}
	}

	if v, ok := rawMap["summary"]; ok {
		if string(v) == "null" {
			updates["summary"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err == nil {
				updates["summary"] = s
			}
		}
	}

	if v, ok := rawMap["detail"]; ok {
		if string(v) == "null" {
			updates["detail"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err == nil {
				updates["detail"] = s
			}
		}
	}

	if v, ok := rawMap["action"]; ok {
		if string(v) == "null" {
			updates["action"] = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err == nil {
				updates["action"] = s
			}
		}
	}

	if v, ok := rawMap["tags"]; ok {
		if string(v) == "null" {
			updates["tags"] = nil
		} else {
			var tags []string
			if err := json.Unmarshal(v, &tags); err != nil {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "tags 格式錯誤，須為字串陣列",
				})
				return
			}
			updates["tags"] = tags
		}
	}

	if v, ok := rawMap["domains"]; ok {
		if string(v) == "null" {
			updates["domains"] = nil
		} else {
			var domains []string
			if err := json.Unmarshal(v, &domains); err != nil {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "domains 格式錯誤，須為字串陣列",
				})
				return
			}
			updates["domains"] = domains
		}
	}

	if v, ok := rawMap["context"]; ok {
		if string(v) == "null" {
			updates["context"] = nil
		} else {
			// 驗證是合法 JSON object
			var obj map[string]interface{}
			if err := json.Unmarshal(v, &obj); err != nil {
				c.JSON(http.StatusBadRequest, dto.ErrorResponse{
					Code:    model.ErrCodeInvalidInput,
					Message: "context 格式錯誤，須為 JSON 物件",
				})
				return
			}
			raw := json.RawMessage(v)
			updates["context"] = &raw
		}
	}

	if v, ok := rawMap["is_archived"]; ok {
		var b bool
		if err := json.Unmarshal(v, &b); err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "is_archived 格式錯誤，須為布林值",
			})
			return
		}
		updates["is_archived"] = b
	}

	entry, err := h.svc.Update(c.Request.Context(), id, updates)
	if err != nil {
		handleEntryError(c, err)
		return
	}

	c.JSON(http.StatusOK, toEntryResponse(entry))
}

// Delete 硬刪除知識條目
// DELETE /api/v1/entries/:id
func (h *EntryHandler) Delete(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		handleEntryError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// toEntryResponse 將 model.Entry 轉為 dto.EntryResponse
func toEntryResponse(entry *model.Entry) dto.EntryResponse {
	tags := entry.Tags
	if tags == nil {
		tags = []string{}
	}
	domains := entry.Domains
	if domains == nil {
		domains = []string{}
	}
	return dto.EntryResponse{
		ID:              entry.ID,
		Title:           entry.Title,
		Content:         entry.Content,
		Summary:         entry.Summary,
		Detail:          entry.Detail,
		Action:          entry.Action,
		CategoryID:      entry.CategoryID,
		Source:          entry.Source,
		SourceType:      entry.SourceType,
		SourceRef:       entry.SourceRef,
		Tags:            tags,
		Domains:         domains,
		Context:         entry.Context,
		IsArchived:      entry.IsArchived,
		Confidence:      entry.Confidence,
		Confirmations:   entry.Confirmations,
		FlagsCount:      entry.FlagsCount,
		SupersededBy:    entry.SupersededBy,
		LifecycleStatus: entry.LifecycleStatus(),
		CreatedAt:       entry.CreatedAt,
		UpdatedAt:       entry.UpdatedAt,
	}
}

// handleEntryError 處理知識條目相關錯誤
func handleEntryError(c *gin.Context, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		c.JSON(appErr.Status, dto.ErrorResponse{
			Code:    appErr.Code,
			Message: appErr.Message,
		})
		return
	}
	c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: "伺服器內部錯誤",
	})
}
