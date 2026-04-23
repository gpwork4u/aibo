package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// StatsRepository 統計資料庫操作
type StatsRepository struct {
	pool *pgxpool.Pool
}

// NewStatsRepository 建立新的 StatsRepository
func NewStatsRepository(pool *pgxpool.Pool) *StatsRepository {
	return &StatsRepository{pool: pool}
}

// CategoryCount 分類計數
type CategoryCount struct {
	CategoryName string
	Count        int
}

// GetTotalEntries 取得知識條目總數
func (r *StatsRepository) GetTotalEntries(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM entries WHERE is_archived = false`,
	).Scan(&count)
	return count, err
}

// GetTotalCategories 取得分類總數
func (r *StatsRepository) GetTotalCategories(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM categories`,
	).Scan(&count)
	return count, err
}

// GetEntriesByCategory 取得各分類的條目數量
func (r *StatsRepository) GetEntriesByCategory(ctx context.Context) ([]CategoryCount, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT c.name, COUNT(e.id) as entry_count
		 FROM categories c
		 LEFT JOIN entries e ON e.category_id = c.id AND e.is_archived = false
		 GROUP BY c.id, c.name
		 ORDER BY entry_count DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []CategoryCount
	for rows.Next() {
		var cc CategoryCount
		if err := rows.Scan(&cc.CategoryName, &cc.Count); err != nil {
			return nil, err
		}
		result = append(result, cc)
	}
	return result, rows.Err()
}

// RecentEntry 最近條目
type RecentEntry struct {
	ID        string
	Title     string
	CreatedAt time.Time
}

// GetRecentEntries 取得最近 5 筆條目
func (r *StatsRepository) GetRecentEntries(ctx context.Context) ([]RecentEntry, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, COALESCE(title, ''), created_at FROM entries ORDER BY created_at DESC LIMIT 5`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []RecentEntry
	for rows.Next() {
		var re RecentEntry
		if err := rows.Scan(&re.ID, &re.Title, &re.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, re)
	}
	return result, rows.Err()
}

// GetAvgConfidence 取得平均信心度
func (r *StatsRepository) GetAvgConfidence(ctx context.Context) (float64, error) {
	var avg *float64
	err := r.pool.QueryRow(ctx,
		`SELECT AVG(confidence) FROM entries WHERE is_archived = false`,
	).Scan(&avg)
	if err != nil {
		return 0, err
	}
	if avg == nil {
		return 0, nil
	}
	return *avg, nil
}
