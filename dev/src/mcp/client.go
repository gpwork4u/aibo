package mcp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client 封裝 aibo REST API 的 HTTP client
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewClient 建立新的 API client
func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SearchRequest 搜尋請求
type SearchRequest struct {
	Query      string `json:"query"`
	CategoryID string `json:"category_id,omitempty"`
	Limit      int    `json:"limit,omitempty"`
}

// SearchResponse 搜尋回應
type SearchResponse struct {
	Results []SearchResultItem `json:"results"`
	Total   int                `json:"total"`
}

// SearchResultItem 搜尋結果項目
type SearchResultItem struct {
	EntryID        string   `json:"entry_id"`
	Title          *string  `json:"title"`
	Summary        *string  `json:"summary"`
	Detail         *string  `json:"detail,omitempty"`
	Action         *string  `json:"action,omitempty"`
	ContentPreview string   `json:"content_preview"`
	Tags           []string `json:"tags"`
	Relevance      float64  `json:"relevance"`
}

// CreateEntryRequest 建立知識條目請求
type CreateEntryRequest struct {
	Content string   `json:"content"`
	Title   string   `json:"title,omitempty"`
	Tags    []string `json:"tags,omitempty"`
	Source  string   `json:"source,omitempty"`
}

// EntryResponse 知識條目回應
type EntryResponse struct {
	ID         string  `json:"id"`
	Title      *string `json:"title"`
	Confidence float64 `json:"confidence"`
}

// ConfirmResponse 確認回應
type ConfirmResponse struct {
	EntryID       string  `json:"entry_id"`
	Confidence    float64 `json:"confidence"`
	Confirmations int     `json:"confirmations"`
	Message       string  `json:"message"`
}

// FlagRequest 標記請求
type FlagRequestBody struct {
	Reason string  `json:"reason"`
	Note   *string `json:"note,omitempty"`
}

// FlagResponse 標記回應
type FlagResponse struct {
	EntryID    string  `json:"entry_id"`
	Confidence float64 `json:"confidence"`
	FlagsCount int     `json:"flags_count"`
	Message    string  `json:"message"`
}

// RecentEntryItem 最近條目項目
type RecentEntryItem struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
}

// StatsResponse 統計回應
type StatsResponse struct {
	TotalEntries      int                    `json:"total_entries"`
	TotalCategories   int                    `json:"total_categories"`
	EntriesByCategory []CategoryCountItem    `json:"entries_by_category"`
	AvgConfidence     float64                `json:"avg_confidence"`
	RecentEntries     []RecentEntryItem      `json:"recent_entries"`
}

// CategoryCountItem 分類計數項目
type CategoryCountItem struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

// ListEntriesResponse 列表回應（用於統計）
type ListEntriesResponse struct {
	Data       []json.RawMessage `json:"data"`
	Pagination PaginationInfo    `json:"pagination"`
}

// PaginationInfo 分頁資訊
type PaginationInfo struct {
	Total int `json:"total"`
}

// ListCategoriesResponse 分類列表回應
type ListCategoriesResponse struct {
	Data []CategoryItem `json:"data"`
}

// CategoryItem 分類項目
type CategoryItem struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	EntryCount int    `json:"entry_count"`
}

// Search 搜尋知識庫
func (c *Client) Search(req SearchRequest) (*SearchResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("序列化請求失敗: %w", err)
	}

	resp, err := c.doRequest("POST", "/api/v1/search", body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var result SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析回應失敗: %w", err)
	}
	return &result, nil
}

// CreateEntry 建立知識條目
func (c *Client) CreateEntry(req CreateEntryRequest) (*EntryResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("序列化請求失敗: %w", err)
	}

	resp, err := c.doRequest("POST", "/api/v1/entries", body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, c.parseError(resp)
	}

	var result EntryResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析回應失敗: %w", err)
	}
	return &result, nil
}

// Confirm 確認知識條目有用
func (c *Client) Confirm(entryID string) (*ConfirmResponse, error) {
	resp, err := c.doRequest("POST", fmt.Sprintf("/api/v1/entries/%s/confirm", entryID), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var result ConfirmResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析回應失敗: %w", err)
	}
	return &result, nil
}

// Flag 標記知識條目問題
func (c *Client) Flag(entryID, reason string, note *string) (*FlagResponse, error) {
	reqBody := FlagRequestBody{
		Reason: reason,
		Note:   note,
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("序列化請求失敗: %w", err)
	}

	resp, err := c.doRequest("POST", fmt.Sprintf("/api/v1/entries/%s/flag", entryID), body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var result FlagResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析回應失敗: %w", err)
	}
	return &result, nil
}

// GetStats 取得知識庫統計（透過 GET /api/v1/stats）
func (c *Client) GetStats() (*StatsResponse, error) {
	resp, err := c.doRequest("GET", "/api/v1/stats", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var result StatsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析回應失敗: %w", err)
	}
	return &result, nil
}

// doRequest 執行 HTTP 請求
func (c *Client) doRequest(method, path string, body []byte) (*http.Response, error) {
	url := c.baseURL + path

	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("建立請求失敗: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("無法連線到 aibo API server (%s): %w", c.baseURL, err)
	}

	return resp, nil
}

// parseError 解析錯誤回應
func (c *Client) parseError(resp *http.Response) error {
	body, _ := io.ReadAll(resp.Body)

	var errResp struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &errResp); err == nil && errResp.Message != "" {
		return fmt.Errorf("API 錯誤 (%d): %s", resp.StatusCode, errResp.Message)
	}

	return fmt.Errorf("API 錯誤 (%d): %s", resp.StatusCode, string(body))
}
