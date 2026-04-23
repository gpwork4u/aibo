package mcp

import (
	"github.com/mark3labs/mcp-go/server"
)

// NewServer 建立並設定 MCP server，註冊所有 tools
func NewServer(client *Client) *server.MCPServer {
	s := server.NewMCPServer(
		"aibo",
		"1.0.0",
		server.WithToolCapabilities(false),
		server.WithRecovery(),
	)

	handlers := NewToolHandlers(client)

	// 註冊 5 個 tools
	s.AddTool(QueryTool(), handlers.HandleQuery)
	s.AddTool(ProposeTool(), handlers.HandlePropose)
	s.AddTool(ConfirmTool(), handlers.HandleConfirm)
	s.AddTool(FlagTool(), handlers.HandleFlag)
	s.AddTool(StatusTool(), handlers.HandleStatus)

	return s
}
