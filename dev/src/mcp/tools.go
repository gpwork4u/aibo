package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
)

// ToolHandlers 封裝所有 MCP tool handler
type ToolHandlers struct {
	client *Client
}

// NewToolHandlers 建立新的 ToolHandlers
func NewToolHandlers(client *Client) *ToolHandlers {
	return &ToolHandlers{client: client}
}

// QueryTool 定義 aibo_query tool
func QueryTool() mcp.Tool {
	return mcp.NewTool("aibo_query",
		mcp.WithDescription("搜尋使用者的個人知識庫。回傳最相關的知識條目，包含 summary、detail、action。用這些知識來代表使用者回答問題。"),
		mcp.WithString("query",
			mcp.Required(),
			mcp.Description("搜尋查詢字串"),
		),
		mcp.WithString("category",
			mcp.Description("限定分類名稱（可選）"),
		),
		mcp.WithString("domain",
			mcp.Description("限定技術領域（可選，如 golang, postgresql, docker）"),
		),
		mcp.WithNumber("limit",
			mcp.Description("回傳數量上限（預設 5，最大 20）"),
		),
	)
}

// HandleQuery 處理 aibo_query tool 呼叫
func (h *ToolHandlers) HandleQuery(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	query := mcp.ParseString(req, "query", "")
	if query == "" {
		return mcp.NewToolResultError("query 參數為必填"), nil
	}

	category := mcp.ParseString(req, "category", "")
	domain := mcp.ParseString(req, "domain", "")
	limit := int(mcp.ParseInt64(req, "limit", 5))

	if limit < 1 {
		limit = 1
	}
	if limit > 20 {
		limit = 20
	}

	searchReq := SearchRequest{
		Query:      query,
		CategoryID: category,
		Domain:     domain,
		Limit:      limit,
	}

	result, err := h.client.Search(searchReq)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("搜尋失敗: %s", err.Error())), nil
	}

	return mcp.NewToolResultText(FormatSearchResults(result.Results, result.Total)), nil
}

// ProposeTool 定義 aibo_propose tool
func ProposeTool() mcp.Tool {
	return mcp.NewTool("aibo_propose",
		mcp.WithDescription("向使用者的知識庫提出新的知識條目。會自動進行 LLM 分類。"),
		mcp.WithString("content",
			mcp.Required(),
			mcp.Description("知識內容"),
		),
		mcp.WithString("title",
			mcp.Description("標題（可選，LLM 會自動產生）"),
		),
		mcp.WithArray("tags",
			mcp.Description("標籤（可選）"),
		),
		mcp.WithString("source",
			mcp.Description("知識來源（可選）"),
		),
	)
}

// HandlePropose 處理 aibo_propose tool 呼叫
func (h *ToolHandlers) HandlePropose(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	content := mcp.ParseString(req, "content", "")
	if content == "" {
		return mcp.NewToolResultError("content 參數為必填"), nil
	}

	title := mcp.ParseString(req, "title", "")
	source := mcp.ParseString(req, "source", "")

	// 解析 tags
	var tags []string
	if args := req.GetArguments(); args != nil {
		if rawTags, ok := args["tags"]; ok {
			if tagSlice, ok := rawTags.([]interface{}); ok {
				for _, t := range tagSlice {
					if s, ok := t.(string); ok {
						tags = append(tags, s)
					}
				}
			}
		}
	}

	createReq := CreateEntryRequest{
		Content: content,
		Title:   title,
		Tags:    tags,
		Source:  source,
	}

	result, err := h.client.CreateEntry(createReq)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("建立知識條目失敗: %s", err.Error())), nil
	}

	return mcp.NewToolResultText(FormatEntryCreated(result)), nil
}

// ConfirmTool 定義 aibo_confirm tool
func ConfirmTool() mcp.Tool {
	return mcp.NewTool("aibo_confirm",
		mcp.WithDescription("確認某筆知識條目有用且正確，提升其信心度。"),
		mcp.WithString("entry_id",
			mcp.Required(),
			mcp.Description("知識條目 UUID"),
		),
	)
}

// HandleConfirm 處理 aibo_confirm tool 呼叫
func (h *ToolHandlers) HandleConfirm(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	entryID := mcp.ParseString(req, "entry_id", "")
	if entryID == "" {
		return mcp.NewToolResultError("entry_id 參數為必填"), nil
	}

	result, err := h.client.Confirm(entryID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("確認知識條目失敗: %s", err.Error())), nil
	}

	return mcp.NewToolResultText(FormatConfirmResult(result)), nil
}

// FlagTool 定義 aibo_flag tool
func FlagTool() mcp.Tool {
	return mcp.NewTool("aibo_flag",
		mcp.WithDescription("標記某筆知識條目有問題（過時、不正確、需更新）。"),
		mcp.WithString("entry_id",
			mcp.Required(),
			mcp.Description("知識條目 UUID"),
		),
		mcp.WithString("reason",
			mcp.Required(),
			mcp.Description("標記原因"),
			mcp.Enum("outdated", "inaccurate", "incomplete", "duplicate"),
		),
		mcp.WithString("note",
			mcp.Description("補充說明（可選）"),
		),
	)
}

// HandleFlag 處理 aibo_flag tool 呼叫
func (h *ToolHandlers) HandleFlag(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	entryID := mcp.ParseString(req, "entry_id", "")
	if entryID == "" {
		return mcp.NewToolResultError("entry_id 參數為必填"), nil
	}

	reason := mcp.ParseString(req, "reason", "")
	if reason == "" {
		return mcp.NewToolResultError("reason 參數為必填"), nil
	}

	var note *string
	if n := mcp.ParseString(req, "note", ""); n != "" {
		note = &n
	}

	result, err := h.client.Flag(entryID, reason, note)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("標記知識條目失敗: %s", err.Error())), nil
	}

	return mcp.NewToolResultText(FormatFlagResult(result)), nil
}

// StatusTool 定義 aibo_status tool
func StatusTool() mcp.Tool {
	return mcp.NewTool("aibo_status",
		mcp.WithDescription("查看知識庫統計資訊：條目總數、分類分布、平均信心度。"),
	)
}

// HandleStatus 處理 aibo_status tool 呼叫
func (h *ToolHandlers) HandleStatus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	result, err := h.client.GetStats()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("取得統計資訊失敗: %s", err.Error())), nil
	}

	return mcp.NewToolResultText(FormatStats(result)), nil
}
