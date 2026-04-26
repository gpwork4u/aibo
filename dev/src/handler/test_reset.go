package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TestResetHandler 測試用 DB reset handler
// 只在 AIBO_TEST_MODE=1 時啟用，TRUNCATE 所有 user-data tables（保留 schema/migrations）
type TestResetHandler struct {
	pool *pgxpool.Pool
}

// NewTestResetHandler 建立新的 TestResetHandler
func NewTestResetHandler(pool *pgxpool.Pool) *TestResetHandler {
	return &TestResetHandler{pool: pool}
}

// Reset TRUNCATE 所有 user-data tables（CASCADE）
// POST /api/v1/__test/reset
func (h *TestResetHandler) Reset(c *gin.Context) {
	tables := []string{
		"journal_entries",
		"tasks",
		"projects",
		"quality_flags",
		"knowledge_relationships",
		"entry_tags",
		"tags",
		"entries",
		"llm_providers",
		"gcal_integrations",
		"oauth_states",
		"categories",
		"api_keys",
	}

	ctx := context.Background()
	conn, err := h.pool.Acquire(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "無法取得 DB 連線: " + err.Error(),
		})
		return
	}
	defer conn.Release()

	for _, table := range tables {
		if _, err := conn.Exec(ctx, "TRUNCATE TABLE "+table+" CASCADE"); err != nil {
			// 忽略不存在的表（不同 migration 版本可能不同）
			continue
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "DB reset 完成"})
}
