package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/jackc/pgx/v5"
)

// EntryRepository defines the interface for entry data access.
// Used by: EntryService, ClassifierService, GitImportService, GcalService, LifecycleService
type EntryRepository interface {
	Create(ctx context.Context, entry *model.Entry) error
	FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error)
	List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error)
	Update(ctx context.Context, entry *model.Entry) error
	Delete(ctx context.Context, id uuid.UUID) error
	ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error)
	FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error)
	GetFlags(ctx context.Context, entryID uuid.UUID) ([]model.EntryFlag, error)
	ExistsBySourceRef(ctx context.Context, sourceType, sourceRef string) (bool, error)
	GetByGcalRef(ctx context.Context, gcalID string) (uuid.UUID, error)
	CategoryExists(ctx context.Context, id uuid.UUID) (bool, error)
	// ListByDateRange 依日期區間撈取 entry（F-026 行事曆彙整 API 使用）
	ListByDateRange(ctx context.Context, sinceDate, untilDate string, tz string) ([]dto.CalendarEntrySummary, error)
	// Lifecycle methods (defined in repository/lifecycle.go on EntryRepository)
	SupersedeEntry(ctx context.Context, oldID, newID uuid.UUID) (*model.Entry, error)
	ClearSupersede(ctx context.Context, id uuid.UUID) (*model.Entry, error)
	GetSupersedeChain(ctx context.Context, id uuid.UUID) ([]repository.HistoryItem, error)
	CheckCircularSupersede(ctx context.Context, oldID, newID uuid.UUID) (bool, error)
}

// CategoryRepository defines the interface for category data access.
// Used by: CategoryService, ClassifierService
type CategoryRepository interface {
	Create(ctx context.Context, cat *model.Category) error
	FindByID(ctx context.Context, id uuid.UUID) (*model.Category, error)
	List(ctx context.Context) ([]model.Category, error)
	Update(ctx context.Context, cat *model.Category) error
	Delete(ctx context.Context, id uuid.UUID) error
	ExistsByID(ctx context.Context, id uuid.UUID) (bool, error)
}

// SearchRepository defines the interface for search data access.
// Used by: SearchService
type SearchRepository interface {
	Search(ctx context.Context, params repository.SearchParams) ([]repository.SearchResult, int, error)
}

// LlmProviderRepository defines the interface for LLM provider data access.
// Used by: LlmProviderService
type LlmProviderRepository interface {
	Create(ctx context.Context, provider *model.LlmProvider) error
	CreateTx(ctx context.Context, tx pgx.Tx, provider *model.LlmProvider) error
	FindByID(ctx context.Context, id uuid.UUID) (*model.LlmProvider, error)
	List(ctx context.Context) ([]model.LlmProvider, error)
	Update(ctx context.Context, provider *model.LlmProvider) error
	UpdateTx(ctx context.Context, tx pgx.Tx, provider *model.LlmProvider) error
	Delete(ctx context.Context, id uuid.UUID) error
	BeginTx(ctx context.Context) (pgx.Tx, error)
	ClearDefault(ctx context.Context, tx pgx.Tx) error
	SetDefault(ctx context.Context, tx pgx.Tx, id uuid.UUID) error
	FindDefaultActive(ctx context.Context) (*model.LlmProvider, error)
	FindAnyActive(ctx context.Context) (*model.LlmProvider, error)
}

// GcalIntegrationRepository defines the interface for Google Calendar integration data access.
// Used by: GcalService
type GcalIntegrationRepository interface {
	Get(ctx context.Context) (*model.GcalIntegration, error)
	Upsert(ctx context.Context, integration *model.GcalIntegration) error
	UpdateTokens(ctx context.Context, id interface{}, accessToken, refreshToken string, expiry interface{}) error
	SaveOAuthState(ctx context.Context, state string) error
	ValidateOAuthState(ctx context.Context, state string) (bool, error)
	CleanExpiredOAuthStates(ctx context.Context) error
}

// ApiKeyRepository defines the interface for API key data access.
// Used by: ApiKeyService
type ApiKeyRepository interface {
	Count(ctx context.Context) (int, error)
	CountActiveValid(ctx context.Context) (int, error)
	Create(ctx context.Context, apiKey *model.ApiKey) error
	FindByKeyHash(ctx context.Context, keyHash string) (*model.ApiKey, error)
	FindByID(ctx context.Context, id uuid.UUID) (*model.ApiKey, error)
	List(ctx context.Context) ([]model.ApiKey, error)
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateLastUsedAt(ctx context.Context, id uuid.UUID) error
}

// StatsRepository defines the interface for statistics data access.
// Used by: StatsService
type StatsRepository interface {
	GetTotalEntries(ctx context.Context) (int, error)
	GetTotalCategories(ctx context.Context) (int, error)
	GetEntriesByCategory(ctx context.Context) ([]repository.CategoryCount, error)
	GetAvgConfidence(ctx context.Context) (float64, error)
	GetRecentEntries(ctx context.Context) ([]repository.RecentEntry, error)
}

// SystemRepository defines the interface for system information data access.
// Used by: SystemService
type SystemRepository interface {
	ExtensionInstalled(ctx context.Context, extName string) (bool, error)
}

// Compile-time interface satisfaction checks.
// These ensure that the concrete repository structs implement the interfaces.
var _ EntryRepository = (*repository.EntryRepository)(nil)
var _ CategoryRepository = (*repository.CategoryRepository)(nil)
var _ SearchRepository = (*repository.SearchRepository)(nil)
var _ LlmProviderRepository = (*repository.LlmProviderRepository)(nil)
var _ GcalIntegrationRepository = (*repository.GcalIntegrationRepository)(nil)
var _ ApiKeyRepository = (*repository.ApiKeyRepository)(nil)
var _ StatsRepository = (*repository.StatsRepository)(nil)
var _ SystemRepository = (*repository.SystemRepository)(nil)
