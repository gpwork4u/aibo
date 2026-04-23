package handler_test

import (
	"encoding/json"
	"testing"

	"github.com/gpwork4u/aibo/dto"
)

// TestSmartSearchRequestWithDomains 測試 SmartSearchRequest 包含 domains
func TestSmartSearchRequestWithDomains(t *testing.T) {
	jsonStr := `{"query":"middleware","domains":["golang"],"limit":10}`

	var req dto.SmartSearchRequest
	if err := json.Unmarshal([]byte(jsonStr), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Query != "middleware" {
		t.Errorf("expected query 'middleware', got '%s'", req.Query)
	}
	if len(req.Domains) != 1 || req.Domains[0] != "golang" {
		t.Errorf("expected domains=['golang'], got %v", req.Domains)
	}
}

// TestSmartSearchRequestWithContextFilter 測試 SmartSearchRequest 包含 context_filter
func TestSmartSearchRequestWithContextFilter(t *testing.T) {
	jsonStr := `{"query":"auth","context_filter":{"languages":["go"],"frameworks":["gin"]}}`

	var req dto.SmartSearchRequest
	if err := json.Unmarshal([]byte(jsonStr), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(req.ContextFilter) != 2 {
		t.Errorf("expected 2 context_filter keys, got %d", len(req.ContextFilter))
	}

	// 解析 languages 值
	var langs []string
	if raw, ok := req.ContextFilter["languages"]; ok {
		if err := json.Unmarshal(raw, &langs); err != nil {
			t.Fatalf("failed to unmarshal languages: %v", err)
		}
	}
	if len(langs) != 1 || langs[0] != "go" {
		t.Errorf("expected languages=['go'], got %v", langs)
	}
}

// TestSmartSearchRequestBackwardCompatible 測試 SmartSearchRequest 向下相容（無 domains/context_filter）
func TestSmartSearchRequestBackwardCompatible(t *testing.T) {
	jsonStr := `{"query":"middleware","limit":10}`

	var req dto.SmartSearchRequest
	if err := json.Unmarshal([]byte(jsonStr), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Domains != nil {
		t.Errorf("expected nil domains for backward compat, got %v", req.Domains)
	}
	if req.ContextFilter != nil {
		t.Errorf("expected nil context_filter for backward compat, got %v", req.ContextFilter)
	}
}

// TestSearchResultItemIncludesDomains 測試搜尋結果包含 domains/context
func TestSearchResultItemIncludesDomains(t *testing.T) {
	ctx := json.RawMessage(`{"languages":["go"]}`)
	item := dto.SearchResultItem{
		Domains: []string{"golang"},
		Context: &ctx,
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	domains, ok := parsed["domains"].([]interface{})
	if !ok || len(domains) != 1 || domains[0] != "golang" {
		t.Errorf("expected domains=[golang], got %v", parsed["domains"])
	}

	if _, ok := parsed["context"]; !ok {
		t.Error("expected context field in search result")
	}
}

// TestSimpleSearchResultItemIncludesDomains 測試簡單搜尋結果包含 domains/context
func TestSimpleSearchResultItemIncludesDomains(t *testing.T) {
	item := dto.SimpleSearchResultItem{
		Domains: []string{"docker", "kubernetes"},
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	domains, ok := parsed["domains"].([]interface{})
	if !ok || len(domains) != 2 {
		t.Errorf("expected 2 domains, got %v", parsed["domains"])
	}
}

// TestCreateEntryRequestWithDomains 測試建立 Entry 請求包含 domains/context
func TestCreateEntryRequestWithDomains(t *testing.T) {
	jsonStr := `{
		"content": "Using Gin middleware for JWT auth",
		"domains": ["golang"],
		"context": {"languages": ["go"], "frameworks": ["gin"]}
	}`

	var req dto.CreateEntryRequest
	if err := json.Unmarshal([]byte(jsonStr), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(req.Domains) != 1 || req.Domains[0] != "golang" {
		t.Errorf("expected domains=['golang'], got %v", req.Domains)
	}
	if req.Context == nil {
		t.Fatal("expected context to be non-nil")
	}

	var ctx map[string]interface{}
	if err := json.Unmarshal(*req.Context, &ctx); err != nil {
		t.Fatalf("failed to unmarshal context: %v", err)
	}
	langs, ok := ctx["languages"].([]interface{})
	if !ok || len(langs) != 1 || langs[0] != "go" {
		t.Errorf("expected languages=['go'], got %v", ctx["languages"])
	}
}

// TestEntryResponseIncludesDomains 測試 EntryResponse 包含 domains/context
func TestEntryResponseIncludesDomains(t *testing.T) {
	ctx := json.RawMessage(`{"pattern":"middleware"}`)
	resp := dto.EntryResponse{
		Domains: []string{"golang"},
		Context: &ctx,
		Tags:    []string{"gin", "auth"},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// 驗證 domains 存在
	if _, ok := parsed["domains"]; !ok {
		t.Error("expected domains field in response")
	}

	// 驗證 context 存在
	if _, ok := parsed["context"]; !ok {
		t.Error("expected context field in response")
	}

	// 驗證 tags 仍存在（向下相容）
	if _, ok := parsed["tags"]; !ok {
		t.Error("expected tags field in response (backward compat)")
	}
}

// TestClassifyResultWithDomains 測試 ClassifyResult 包含 domains/context
func TestClassifyResultWithDomains(t *testing.T) {
	jsonStr := `{
		"category": "Backend Development",
		"tags": ["middleware", "auth"],
		"domains": ["golang"],
		"context": {"languages": ["go"], "frameworks": ["gin"], "pattern": "middleware"},
		"title": "Gin JWT Middleware",
		"summary": "使用 Gin middleware 實作 JWT 認證",
		"detail": "詳細說明",
		"action": "供參考"
	}`

	var result dto.ClassifyResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(result.Domains) != 1 || result.Domains[0] != "golang" {
		t.Errorf("expected domains=['golang'], got %v", result.Domains)
	}
	if result.Context == nil {
		t.Fatal("expected context to be non-nil")
	}

	var ctx map[string]interface{}
	if err := json.Unmarshal(*result.Context, &ctx); err != nil {
		t.Fatalf("failed to unmarshal context: %v", err)
	}
	if ctx["pattern"] != "middleware" {
		t.Errorf("expected pattern='middleware', got '%v'", ctx["pattern"])
	}
}

// TestClassifyResultBackwardCompatible 測試舊格式 ClassifyResult（無 domains/context）
func TestClassifyResultBackwardCompatible(t *testing.T) {
	jsonStr := `{
		"category": "Backend Development",
		"tags": ["middleware"],
		"title": "Test",
		"summary": "Test",
		"detail": "Test",
		"action": "供參考"
	}`

	var result dto.ClassifyResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if result.Domains != nil {
		t.Errorf("expected nil domains for old format, got %v", result.Domains)
	}
	if result.Context != nil {
		t.Errorf("expected nil context for old format, got %v", result.Context)
	}
}
