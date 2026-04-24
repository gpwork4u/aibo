package handler_test

import (
	"context"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/service"
)

// hAggGcalRepo implements service.GcalIntegrationRepository
// connected = true 時 Get() 回 stub integration，代表已連。
type hAggGcalRepo struct {
	connected bool
}

func (h *hAggGcalRepo) Get(_ context.Context) (*model.GcalIntegration, error) {
	if h.connected {
		return &model.GcalIntegration{ID: uuid.New()}, nil
	}
	return nil, nil
}
func (h *hAggGcalRepo) Upsert(_ context.Context, _ *model.GcalIntegration) error { return nil }
func (h *hAggGcalRepo) UpdateTokens(_ context.Context, _ interface{}, _, _ string, _ interface{}) error {
	return nil
}
func (h *hAggGcalRepo) SaveOAuthState(_ context.Context, _ string) error { return nil }
func (h *hAggGcalRepo) ValidateOAuthState(_ context.Context, _ string) (bool, error) {
	return false, nil
}
func (h *hAggGcalRepo) CleanExpiredOAuthStates(_ context.Context) error { return nil }

var _ service.GcalIntegrationRepository = (*hAggGcalRepo)(nil)

// hEntryRepo minimal EntryRepository stub
type hEntryRepo struct{}

func (h *hEntryRepo) ListByDateRange(_ context.Context, _, _ string, _ string) ([]dto.CalendarEntrySummary, error) {
	return nil, nil
}
func (h *hEntryRepo) Create(_ context.Context, _ *model.Entry) error { return nil }
func (h *hEntryRepo) FindByID(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (h *hEntryRepo) List(_ context.Context, _ model.EntryFilter) (*model.EntryListResult, error) {
	return nil, nil
}
func (h *hEntryRepo) Update(_ context.Context, _ *model.Entry) error { return nil }
func (h *hEntryRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (h *hEntryRepo) ConfirmEntry(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (h *hEntryRepo) FlagEntry(_ context.Context, _ uuid.UUID, _ string, _ *string) (*model.Entry, *model.EntryFlag, error) {
	return nil, nil, nil
}
func (h *hEntryRepo) GetFlags(_ context.Context, _ uuid.UUID) ([]model.EntryFlag, error) {
	return nil, nil
}
func (h *hEntryRepo) ExistsBySourceRef(_ context.Context, _, _ string) (bool, error) {
	return false, nil
}
func (h *hEntryRepo) CategoryExists(_ context.Context, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (h *hEntryRepo) SupersedeEntry(_ context.Context, _, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (h *hEntryRepo) ClearSupersede(_ context.Context, _ uuid.UUID) (*model.Entry, error) {
	return nil, nil
}
func (h *hEntryRepo) GetSupersedeChain(_ context.Context, _ uuid.UUID) ([]repository.HistoryItem, error) {
	return nil, nil
}
func (h *hEntryRepo) CheckCircularSupersede(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}

var _ service.EntryRepository = (*hEntryRepo)(nil)
