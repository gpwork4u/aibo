package dto

// GitImportRequest Git 匯入請求
type GitImportRequest struct {
	RepoPath string  `json:"repo_path" binding:"required"`
	Since    *string `json:"since"`
	Until    *string `json:"until"`
	Author   *string `json:"author"`
	Branch   *string `json:"branch"`
}

// GitImportResponse Git 匯入回應
type GitImportResponse struct {
	CommitsFound   int             `json:"commits_found"`
	EntriesCreated int             `json:"entries_created"`
	EntriesSkipped int             `json:"entries_skipped"`
	SkippedReasons []SkippedReason `json:"skipped_reasons"`
}

// SkippedReason 略過原因
type SkippedReason struct {
	CommitHash string `json:"commit_hash"`
	Reason     string `json:"reason"`
}
