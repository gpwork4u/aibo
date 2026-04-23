package mcp_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	aimcp "github.com/gpwork4u/aibo/mcp"
)

func TestClient_Search(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 驗證請求
		if r.Method != "POST" {
			t.Errorf("期望 POST，得到 %s", r.Method)
		}
		if r.URL.Path != "/api/v1/search" {
			t.Errorf("期望 /api/v1/search，得到 %s", r.URL.Path)
		}
		if r.Header.Get("X-API-Key") != "test-key" {
			t.Errorf("期望 API Key test-key，得到 %s", r.Header.Get("X-API-Key"))
		}

		resp := aimcp.SearchResponse{
			Results: []aimcp.SearchResultItem{
				{
					EntryID:        "abc-123",
					Title:          strPtr("測試"),
					ContentPreview: "測試內容",
					Relevance:      0.9,
				},
			},
			Total: 1,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := aimcp.NewClient(server.URL, "test-key")
	result, err := client.Search(aimcp.SearchRequest{
		Query: "test",
		Limit: 5,
	})
	if err != nil {
		t.Fatalf("搜尋失敗: %v", err)
	}
	if result.Total != 1 {
		t.Errorf("期望 1 筆結果，得到 %d", result.Total)
	}
	if result.Results[0].EntryID != "abc-123" {
		t.Errorf("期望 entry ID abc-123，得到 %s", result.Results[0].EntryID)
	}
}

func TestClient_CreateEntry(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/api/v1/entries" {
			t.Errorf("錯誤的請求: %s %s", r.Method, r.URL.Path)
		}

		w.WriteHeader(http.StatusCreated)
		resp := aimcp.EntryResponse{
			ID:    "new-id",
			Title: strPtr("新知識"),
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := aimcp.NewClient(server.URL, "test-key")
	result, err := client.CreateEntry(aimcp.CreateEntryRequest{
		Content: "測試內容",
		Title:   "新知識",
	})
	if err != nil {
		t.Fatalf("建立失敗: %v", err)
	}
	if result.ID != "new-id" {
		t.Errorf("期望 ID new-id，得到 %s", result.ID)
	}
}

func TestClient_Confirm(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/api/v1/entries/test-id/confirm" {
			t.Errorf("錯誤的請求: %s %s", r.Method, r.URL.Path)
		}

		resp := aimcp.ConfirmResponse{
			EntryID:       "test-id",
			Confidence:    0.85,
			Confirmations: 3,
			Message:       "已確認",
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := aimcp.NewClient(server.URL, "test-key")
	result, err := client.Confirm("test-id")
	if err != nil {
		t.Fatalf("確認失敗: %v", err)
	}
	if result.Confidence != 0.85 {
		t.Errorf("期望信心度 0.85，得到 %f", result.Confidence)
	}
}

func TestClient_Flag(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/api/v1/entries/test-id/flag" {
			t.Errorf("錯誤的請求: %s %s", r.Method, r.URL.Path)
		}

		// 驗證 body
		var body aimcp.FlagRequestBody
		json.NewDecoder(r.Body).Decode(&body)
		if body.Reason != "outdated" {
			t.Errorf("期望 reason outdated，得到 %s", body.Reason)
		}

		resp := aimcp.FlagResponse{
			EntryID:    "test-id",
			Confidence: 0.50,
			FlagsCount: 1,
			Message:    "已標記",
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := aimcp.NewClient(server.URL, "test-key")
	note := "Go 1.24 已改變"
	result, err := client.Flag("test-id", "outdated", &note)
	if err != nil {
		t.Fatalf("標記失敗: %v", err)
	}
	if result.FlagsCount != 1 {
		t.Errorf("期望標記數 1，得到 %d", result.FlagsCount)
	}
}

func TestClient_GetStats(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" || r.URL.Path != "/api/v1/stats" {
			t.Errorf("錯誤的請求: %s %s", r.Method, r.URL.Path)
		}

		resp := aimcp.StatsResponse{
			TotalEntries:    150,
			TotalCategories: 12,
			AvgConfidence:   0.72,
			EntriesByCategory: []aimcp.CategoryCountItem{
				{Category: "golang", Count: 30},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := aimcp.NewClient(server.URL, "test-key")
	result, err := client.GetStats()
	if err != nil {
		t.Fatalf("取得統計失敗: %v", err)
	}
	if result.TotalEntries != 150 {
		t.Errorf("期望 150 筆，得到 %d", result.TotalEntries)
	}
}

func TestClient_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "API Key 無效",
		})
	}))
	defer server.Close()

	client := aimcp.NewClient(server.URL, "bad-key")
	_, err := client.Search(aimcp.SearchRequest{Query: "test"})
	if err == nil {
		t.Fatal("期望錯誤但沒有")
	}
	if err.Error() == "" {
		t.Error("錯誤訊息不應為空")
	}
}

func TestClient_ConnectionError(t *testing.T) {
	client := aimcp.NewClient("http://localhost:1", "test-key")
	_, err := client.Search(aimcp.SearchRequest{Query: "test"})
	if err == nil {
		t.Fatal("期望連線錯誤但沒有")
	}
}
