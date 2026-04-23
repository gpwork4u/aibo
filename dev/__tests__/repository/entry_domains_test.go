package repository_test

import (
	"encoding/json"
	"testing"

	"github.com/gpwork4u/aibo/model"
)

// TestEntryModelDomainsField 測試 Entry model 新增 domains 欄位
func TestEntryModelDomainsField(t *testing.T) {
	entry := model.Entry{
		Domains: []string{"golang", "docker"},
	}

	if len(entry.Domains) != 2 {
		t.Errorf("expected 2 domains, got %d", len(entry.Domains))
	}
	if entry.Domains[0] != "golang" {
		t.Errorf("expected first domain 'golang', got '%s'", entry.Domains[0])
	}
	if entry.Domains[1] != "docker" {
		t.Errorf("expected second domain 'docker', got '%s'", entry.Domains[1])
	}
}

// TestEntryModelContextField 測試 Entry model 新增 context 欄位
func TestEntryModelContextField(t *testing.T) {
	ctx := json.RawMessage(`{"languages":["go"],"frameworks":["gin"],"pattern":"middleware"}`)
	entry := model.Entry{
		Context: &ctx,
	}

	if entry.Context == nil {
		t.Fatal("expected context to be non-nil")
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(*entry.Context, &parsed); err != nil {
		t.Fatalf("failed to unmarshal context: %v", err)
	}

	langs, ok := parsed["languages"].([]interface{})
	if !ok || len(langs) != 1 || langs[0] != "go" {
		t.Errorf("expected languages=[go], got %v", parsed["languages"])
	}
}

// TestEntryModelDomainsDefaultEmpty 測試 Entry model domains 預設為空
func TestEntryModelDomainsDefaultEmpty(t *testing.T) {
	entry := model.Entry{}

	if entry.Domains != nil {
		t.Errorf("expected nil domains for zero value, got %v", entry.Domains)
	}
	if entry.Context != nil {
		t.Error("expected nil context for zero value")
	}
}

// TestEntryFilterDomains 測試 EntryFilter 支援 domains 過濾
func TestEntryFilterDomains(t *testing.T) {
	filter := model.EntryFilter{
		Domains: []string{"golang", "docker"},
	}

	if len(filter.Domains) != 2 {
		t.Errorf("expected 2 domains in filter, got %d", len(filter.Domains))
	}
}

// TestEntryFilterContextFilter 測試 EntryFilter 支援 context 子欄位過濾
func TestEntryFilterContextFilter(t *testing.T) {
	filter := model.EntryFilter{
		ContextFilter: map[string][]string{
			"languages":  {"go"},
			"frameworks": {"gin"},
		},
	}

	if len(filter.ContextFilter) != 2 {
		t.Errorf("expected 2 context filter keys, got %d", len(filter.ContextFilter))
	}
	if filter.ContextFilter["languages"][0] != "go" {
		t.Errorf("expected languages filter 'go', got '%s'", filter.ContextFilter["languages"][0])
	}
}

// TestEntryListItemDomains 測試 EntryListItem 也包含 domains/context
func TestEntryListItemDomains(t *testing.T) {
	ctx := json.RawMessage(`{"languages":["python"]}`)
	item := model.EntryListItem{
		Domains: []string{"python"},
		Context: &ctx,
	}

	if len(item.Domains) != 1 || item.Domains[0] != "python" {
		t.Errorf("expected domains=['python'], got %v", item.Domains)
	}
	if item.Context == nil {
		t.Error("expected context to be non-nil")
	}
}

// TestEntryJSONSerialization 測試 Entry JSON 序列化包含 domains/context
func TestEntryJSONSerialization(t *testing.T) {
	ctx := json.RawMessage(`{"languages":["go"]}`)
	entry := model.Entry{
		Domains: []string{"golang"},
		Context: &ctx,
	}

	data, err := json.Marshal(entry)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	domains, ok := parsed["domains"].([]interface{})
	if !ok || len(domains) != 1 || domains[0] != "golang" {
		t.Errorf("expected domains=[golang] in JSON, got %v", parsed["domains"])
	}

	context, ok := parsed["context"]
	if !ok || context == nil {
		t.Error("expected context in JSON output")
	}
}
