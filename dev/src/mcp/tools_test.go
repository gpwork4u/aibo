package mcp_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mark3labs/mcp-go/mcp"

	aimcp "github.com/gpwork4u/aibo/mcp"
)

// newMockServer 建立模擬 API server
func newMockServer(handler http.HandlerFunc) (*httptest.Server, *aimcp.Client) {
	server := httptest.NewServer(handler)
	client := aimcp.NewClient(server.URL, "test-key")
	return server, client
}

// makeCallToolRequest 建立 CallToolRequest
func makeCallToolRequest(name string, args map[string]interface{}) mcp.CallToolRequest {
	return mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name:      name,
			Arguments: args,
		},
	}
}

func TestHandleQuery_Success(t *testing.T) {
	server, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {
		resp := aimcp.SearchResponse{
			Results: []aimcp.SearchResultItem{
				{
					EntryID:        "abc-123",
					Title:          strPtr("Go 錯誤處理"),
					Summary:        strPtr("Go 的錯誤處理方式"),
					ContentPreview: "內容預覽",
					Tags:           []string{"golang"},
					Relevance:      0.9,
				},
			},
			Total: 1,
		}
		json.NewEncoder(w).Encode(resp)
	})
	defer server.Close()

	handlers := aimcp.NewToolHandlers(client)
	req := makeCallToolRequest("aibo_query", map[string]interface{}{
		"query": "golang error handling",
		"limit": float64(5),
	})

	result, err := handlers.HandleQuery(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 錯誤: %v", err)
	}
	if result.IsError {
		t.Error("不應為錯誤結果")
	}
	// 檢查結果包含內容
	if len(result.Content) == 0 {
		t.Fatal("結果不應為空")
	}
	text := result.Content[0].(mcp.TextContent).Text
	if !strings.Contains(text, "Go 錯誤處理") {
		t.Error("結果應包含搜尋內容")
	}
}

func TestHandleQuery_EmptyQuery(t *testing.T) {
	_, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {})
	handlers := aimcp.NewToolHandlers(client)

	req := makeCallToolRequest("aibo_query", map[string]interface{}{})
	result, err := handlers.HandleQuery(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 錯誤: %v", err)
	}
	if !result.IsError {
		t.Error("空 query 應回傳錯誤")
	}
}

func TestHandlePropose_Success(t *testing.T) {
	server, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		resp := aimcp.EntryResponse{
			ID:    "new-id",
			Title: strPtr("新知識"),
		}
		json.NewEncoder(w).Encode(resp)
	})
	defer server.Close()

	handlers := aimcp.NewToolHandlers(client)
	req := makeCallToolRequest("aibo_propose", map[string]interface{}{
		"content": "Go 1.23 range over func",
		"title":   "Go 1.23 新功能",
		"tags":    []interface{}{"golang", "go1.23"},
	})

	result, err := handlers.HandlePropose(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 錯誤: %v", err)
	}
	if result.IsError {
		t.Error("不應為錯誤結果")
	}
}

func TestHandlePropose_EmptyContent(t *testing.T) {
	_, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {})
	handlers := aimcp.NewToolHandlers(client)

	req := makeCallToolRequest("aibo_propose", map[string]interface{}{})
	result, err := handlers.HandlePropose(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 錯誤: %v", err)
	}
	if !result.IsError {
		t.Error("空 content 應回傳錯誤")
	}
}

func TestHandleConfirm_Success(t *testing.T) {
	server, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {
		resp := aimcp.ConfirmResponse{
			EntryID:       "test-id",
			Confidence:    0.85,
			Confirmations: 3,
		}
		json.NewEncoder(w).Encode(resp)
	})
	defer server.Close()

	handlers := aimcp.NewToolHandlers(client)
	req := makeCallToolRequest("aibo_confirm", map[string]interface{}{
		"entry_id": "test-id",
	})

	result, err := handlers.HandleConfirm(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 錯誤: %v", err)
	}
	if result.IsError {
		t.Error("不應為錯誤結果")
	}
}

func TestHandleFlag_Success(t *testing.T) {
	server, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {
		resp := aimcp.FlagResponse{
			EntryID:    "test-id",
			Confidence: 0.50,
			FlagsCount: 1,
		}
		json.NewEncoder(w).Encode(resp)
	})
	defer server.Close()

	handlers := aimcp.NewToolHandlers(client)
	req := makeCallToolRequest("aibo_flag", map[string]interface{}{
		"entry_id": "test-id",
		"reason":   "outdated",
		"note":     "Go 1.24 已改變",
	})

	result, err := handlers.HandleFlag(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 錯誤: %v", err)
	}
	if result.IsError {
		t.Error("不應為錯誤結果")
	}
}

func TestHandleFlag_MissingRequired(t *testing.T) {
	_, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {})
	handlers := aimcp.NewToolHandlers(client)

	// 缺少 entry_id
	req := makeCallToolRequest("aibo_flag", map[string]interface{}{
		"reason": "outdated",
	})
	result, _ := handlers.HandleFlag(context.Background(), req)
	if !result.IsError {
		t.Error("缺少 entry_id 應回傳錯誤")
	}

	// 缺少 reason
	req = makeCallToolRequest("aibo_flag", map[string]interface{}{
		"entry_id": "test-id",
	})
	result, _ = handlers.HandleFlag(context.Background(), req)
	if !result.IsError {
		t.Error("缺少 reason 應回傳錯誤")
	}
}

func TestHandleStatus_Success(t *testing.T) {
	server, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {
		resp := aimcp.StatsResponse{
			TotalEntries:    150,
			TotalCategories: 12,
			AvgConfidence:   0.72,
			EntriesByCategory: []aimcp.CategoryCountItem{
				{Category: "golang", Count: 30},
			},
		}
		json.NewEncoder(w).Encode(resp)
	})
	defer server.Close()

	handlers := aimcp.NewToolHandlers(client)
	req := makeCallToolRequest("aibo_status", map[string]interface{}{})

	result, err := handlers.HandleStatus(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 錯誤: %v", err)
	}
	if result.IsError {
		t.Error("不應為錯誤結果")
	}
}

func TestHandleQuery_APIError(t *testing.T) {
	server, client := newMockServer(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "API Key 無效或未設定",
		})
	})
	defer server.Close()

	handlers := aimcp.NewToolHandlers(client)
	req := makeCallToolRequest("aibo_query", map[string]interface{}{
		"query": "test",
	})

	result, err := handlers.HandleQuery(context.Background(), req)
	if err != nil {
		t.Fatalf("handler 不應回傳 Go error: %v", err)
	}
	if !result.IsError {
		t.Error("API 錯誤應回傳 MCP error result")
	}
}
