package service

import (
	"testing"

	"github.com/gpwork4u/aibo/repository"
)

func TestValidateSearchQuery(t *testing.T) {
	tests := []struct {
		name    string
		query   string
		wantErr bool
		errMsg  string
	}{
		{
			name:    "正常 query",
			query:   "golang",
			wantErr: false,
		},
		{
			name:    "空 query",
			query:   "",
			wantErr: true,
			errMsg:  "query 不可為空",
		},
		{
			name:    "只有空白",
			query:   "   ",
			wantErr: true,
			errMsg:  "query 不可為空",
		},
		{
			name:    "恰好 500 字",
			query:   string(make([]rune, 500)),
			wantErr: false,
		},
		{
			name:    "超過 500 字",
			query:   string(append(make([]rune, 500), 'a')),
			wantErr: true,
			errMsg:  "query 不可超過 500 字",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSearchQuery(tt.query)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if err.Message != tt.errMsg {
					t.Errorf("expected error message %q, got %q", tt.errMsg, err.Message)
				}
			} else {
				if err != nil {
					t.Errorf("expected no error, got %v", err)
				}
			}
		})
	}
}

func TestFindMatchedKeywords(t *testing.T) {
	title := "Go 語言效能優化"
	content := "本文介紹 golang 的效能優化技巧"
	result := repository.SearchResult{
		Title:          &title,
		ContentPreview: &content,
		Tags:           []string{"golang", "performance"},
	}

	keywords := []string{"golang", "go", "效能", "python"}
	matched := findMatchedKeywords(result, keywords)

	// 應該匹配到 golang, go, 效能
	if len(matched) < 3 {
		t.Errorf("expected at least 3 matched keywords, got %d: %v", len(matched), matched)
	}

	// python 不應該匹配到
	for _, kw := range matched {
		if kw == "python" {
			t.Errorf("python should not be matched")
		}
	}
}
