package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SystemRepository 系統資訊資料庫操作
type SystemRepository struct {
	pool *pgxpool.Pool
}

// NewSystemRepository 建立新的 SystemRepository
func NewSystemRepository(pool *pgxpool.Pool) *SystemRepository {
	return &SystemRepository{pool: pool}
}

// ExtensionInstalled 檢查 PostgreSQL 擴展是否已安裝
func (r *SystemRepository) ExtensionInstalled(ctx context.Context, extName string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = $1)",
		extName,
	).Scan(&exists)
	return exists, err
}
