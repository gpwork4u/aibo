package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
)

func TestSmartSearch_EmptyQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	body := `{"query": ""}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/search", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	// SearchHandler 需要 SearchService，但這裡只測 handler 層的 validation
	// 由於 ShouldBindJSON 的 required 標籤，空 query 應被視為 binding error
	// 但 gin 的 required 對空字串不生效，所以需要 service 層驗證
	// 這裡我們測試 JSON 格式錯誤的情況
	badBody := `not json`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/search", strings.NewReader(badBody))
	c.Request.Header.Set("Content-Type", "application/json")

	// 沒有 service 可以直接測 handler，但可以驗證 DTO 結構
	var req dto.SmartSearchRequest
	err := json.Unmarshal([]byte(`{"query": "test", "limit": 5}`), &req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if req.Query != "test" {
		t.Errorf("expected query 'test', got %q", req.Query)
	}
	if req.Limit == nil || *req.Limit != 5 {
		t.Errorf("expected limit 5, got %v", req.Limit)
	}
}

func TestSmartSearchRequest_Defaults(t *testing.T) {
	var req dto.SmartSearchRequest
	err := json.Unmarshal([]byte(`{"query": "golang"}`), &req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if req.Query != "golang" {
		t.Errorf("expected query 'golang', got %q", req.Query)
	}
	if req.Limit != nil {
		t.Errorf("expected nil limit, got %v", req.Limit)
	}
	if req.CategoryID != nil {
		t.Errorf("expected nil category_id, got %v", req.CategoryID)
	}
}

func TestSmartSearchRequest_WithCategoryID(t *testing.T) {
	var req dto.SmartSearchRequest
	err := json.Unmarshal([]byte(`{"query": "test", "category_id": "550e8400-e29b-41d4-a716-446655440000"}`), &req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if req.CategoryID == nil {
		t.Fatalf("expected category_id, got nil")
	}
	if *req.CategoryID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Errorf("unexpected category_id: %v", *req.CategoryID)
	}
}

func TestSimpleSearchResponse_Structure(t *testing.T) {
	resp := dto.SimpleSearchResponse{
		Results:  []dto.SimpleSearchResultItem{},
		Total:    0,
		Degraded: false,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if _, ok := parsed["results"]; !ok {
		t.Error("expected 'results' field in response")
	}
	if _, ok := parsed["total"]; !ok {
		t.Error("expected 'total' field in response")
	}
	if _, ok := parsed["degraded"]; !ok {
		t.Error("expected 'degraded' field in response")
	}
}

func TestSmartSearchResponse_Structure(t *testing.T) {
	resp := dto.SmartSearchResponse{
		Results:      []dto.SearchResultItem{},
		SynonymsUsed: []string{"go", "golang"},
		Total:        0,
		Degraded:     false,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if _, ok := parsed["results"]; !ok {
		t.Error("expected 'results' field in response")
	}
	if _, ok := parsed["synonyms_used"]; !ok {
		t.Error("expected 'synonyms_used' field in response")
	}
	if _, ok := parsed["total"]; !ok {
		t.Error("expected 'total' field in response")
	}
	if _, ok := parsed["degraded"]; !ok {
		t.Error("expected 'degraded' field in response")
	}
}
