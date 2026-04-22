package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

// SearchHandler 搜尋 HTTP handlers
type SearchHandler struct {
	searchSvc *service.SearchService
}

// NewSearchHandler 建立新的 SearchHandler
func NewSearchHandler(searchSvc *service.SearchService) *SearchHandler {
	return &SearchHandler{searchSvc: searchSvc}
}

// SmartSearch 智慧搜尋
// POST /api/v1/search
func (h *SearchHandler) SmartSearch(c *gin.Context) {
	var req dto.SmartSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "請求格式錯誤: " + err.Error(),
		})
		return
	}

	// 預設 limit = 10
	limit := 10
	if req.Limit != nil {
		limit = *req.Limit
	}

	// 驗證 limit 範圍
	if limit < 1 || limit > 50 {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "limit 必須為 1-50 的整數",
		})
		return
	}

	// 解析 category_id
	var categoryID *uuid.UUID
	if req.CategoryID != nil && *req.CategoryID != "" {
		parsed, err := uuid.Parse(*req.CategoryID)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "無效的 category_id 格式",
			})
			return
		}
		categoryID = &parsed
	}

	result, err := h.searchSvc.SmartSearch(c.Request.Context(), service.SmartSearchInput{
		Query:      req.Query,
		CategoryID: categoryID,
		Limit:      limit,
	})
	if err != nil {
		handleSearchError(c, err)
		return
	}

	// 轉換為 response DTO
	items := make([]dto.SearchResultItem, 0, len(result.Results))
	for _, r := range result.Results {
		tags := r.Tags
		if tags == nil {
			tags = []string{}
		}
		matchedKW := r.MatchedKeywords
		if matchedKW == nil {
			matchedKW = []string{}
		}
		items = append(items, dto.SearchResultItem{
			EntryID:         r.EntryID,
			Title:           r.Title,
			ContentPreview:  r.ContentPreview,
			Tags:            tags,
			Relevance:       r.Relevance,
			MatchedKeywords: matchedKW,
		})
	}

	synonyms := result.SynonymsUsed
	if synonyms == nil {
		synonyms = []string{}
	}

	c.JSON(http.StatusOK, dto.SmartSearchResponse{
		Results:      items,
		SynonymsUsed: synonyms,
		Total:        result.Total,
		Degraded:     result.Degraded,
	})
}

// SimpleSearch 簡單搜尋
// GET /api/v1/search/simple
func (h *SearchHandler) SimpleSearch(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    model.ErrCodeInvalidInput,
			Message: "q 參數不可為空",
		})
		return
	}

	// 解析 category_id
	var categoryID *uuid.UUID
	if catStr := c.Query("category_id"); catStr != "" {
		parsed, err := uuid.Parse(catStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "無效的 category_id 格式",
			})
			return
		}
		categoryID = &parsed
	}

	// 解析 tags
	tags := c.QueryArray("tag")

	// 解析 limit
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed < 1 || parsed > 50 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "limit 必須為 1-50 的整數",
			})
			return
		}
		limit = parsed
	}

	// 解析 offset
	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		parsed, err := strconv.Atoi(offsetStr)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Code:    model.ErrCodeInvalidInput,
				Message: "offset 必須為非負整數",
			})
			return
		}
		offset = parsed
	}

	result, err := h.searchSvc.SimpleSearch(c.Request.Context(), service.SimpleSearchInput{
		Query:      q,
		CategoryID: categoryID,
		Tags:       tags,
		Limit:      limit,
		Offset:     offset,
	})
	if err != nil {
		handleSearchError(c, err)
		return
	}

	// 轉換為 response DTO
	items := make([]dto.SimpleSearchResultItem, 0, len(result.Results))
	for _, r := range result.Results {
		tags := r.Tags
		if tags == nil {
			tags = []string{}
		}
		items = append(items, dto.SimpleSearchResultItem{
			EntryID:        r.EntryID,
			Title:          r.Title,
			ContentPreview: r.ContentPreview,
			Tags:           tags,
			Relevance:      r.Relevance,
		})
	}

	c.JSON(http.StatusOK, dto.SimpleSearchResponse{
		Results:  items,
		Total:    result.Total,
		Degraded: result.Degraded,
	})
}

// handleSearchError 處理搜尋相關錯誤
func handleSearchError(c *gin.Context, err error) {
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
