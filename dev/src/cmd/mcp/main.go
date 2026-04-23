package main

import (
	"fmt"
	"os"

	aimcp "github.com/gpwork4u/aibo/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	// 從環境變數讀取設定
	apiURL := os.Getenv("AIBO_API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8080"
	}

	apiKey := os.Getenv("AIBO_API_KEY")
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "錯誤: AIBO_API_KEY 環境變數未設定")
		os.Exit(1)
	}

	// 建立 HTTP client
	client := aimcp.NewClient(apiURL, apiKey)

	// 建立 MCP server
	s := aimcp.NewServer(client)

	// 使用 stdio transport 啟動
	if err := server.ServeStdio(s); err != nil {
		fmt.Fprintf(os.Stderr, "MCP server 錯誤: %v\n", err)
		os.Exit(1)
	}
}
