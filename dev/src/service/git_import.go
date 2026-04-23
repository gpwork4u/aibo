package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	git "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
)

const (
	maxCommitsPerImport = 500
	defaultSinceDays    = 7
)

// sentinel errors
var (
	errOverLimit  = errors.New("over_limit")
	errBreakEarly = errors.New("break_early")
)

// GitImportService Git 匯入業務邏輯
type GitImportService struct {
	entryRepo        EntryRepository
	allowedRepoPaths []string
}

// NewGitImportService 建立新的 GitImportService
func NewGitImportService(entryRepo EntryRepository) *GitImportService {
	return &GitImportService{entryRepo: entryRepo}
}

// SetAllowedRepoPaths 設定允許的 repo 路徑白名單
func (s *GitImportService) SetAllowedRepoPaths(paths []string) {
	s.allowedRepoPaths = paths
	if len(paths) == 0 {
		slog.Warn("ALLOWED_REPO_PATHS 未設定，允許匯入任何路徑")
	}
}

// commitInfo 暫存 commit 資訊
type commitInfo struct {
	Hash     string
	Short    string
	Subject  string
	Message  string
	RepoName string
	RepoPath string
}

// ImportCommits 同步匯入 Git commits 為知識條目
func (s *GitImportService) ImportCommits(ctx context.Context, req dto.GitImportRequest) (*dto.GitImportResponse, error) {
	// 驗證 repo_path
	if strings.TrimSpace(req.RepoPath) == "" {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "repo_path 不可為空")
	}

	// 驗證 repo_path 是否在白名單內
	if err := s.validateRepoPath(req.RepoPath); err != nil {
		return nil, err
	}

	// 開啟 repo
	repo, err := git.PlainOpen(req.RepoPath)
	if err != nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "repo_path 不是有效的 Git repository")
	}

	// 解析時間範圍
	since, until, err := parseTimeRange(req.Since, req.Until)
	if err != nil {
		return nil, err
	}

	// 決定 log 起點
	logOpts := &git.LogOptions{
		Order: git.LogOrderCommitterTime,
	}

	if req.Branch != nil && *req.Branch != "" {
		ref, err := repo.Reference(plumbing.NewBranchReferenceName(*req.Branch), true)
		if err != nil {
			return nil, model.NewAppError(400, model.ErrCodeInvalidInput, fmt.Sprintf("分支 '%s' 不存在", *req.Branch))
		}
		logOpts.From = ref.Hash()
	} else {
		headRef, err := repo.Head()
		if err != nil {
			return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "無法取得 repo HEAD")
		}
		logOpts.From = headRef.Hash()
	}

	// 取得 commit iterator
	logIter, err := repo.Log(logOpts)
	if err != nil {
		return nil, model.NewAppError(400, model.ErrCodeInvalidInput, "無法讀取 commit log")
	}

	// 取 repo 名稱（路徑的最後一層）
	repoName := filepath.Base(req.RepoPath)

	// 收集 commits
	var commits []commitInfo
	var skippedReasons []dto.SkippedReason
	totalFound := 0

	iterErr := logIter.ForEach(func(c *object.Commit) error {
		commitTime := c.Committer.When

		// 超過 until 的跳過（因為按時間降序，較新的先出現）
		if commitTime.After(until) {
			return nil
		}

		// 早於 since 的停止遍歷
		if commitTime.Before(since) {
			return errBreakEarly
		}

		// author 過濾
		if req.Author != nil && *req.Author != "" {
			authorFilter := *req.Author
			if !strings.EqualFold(c.Author.Email, authorFilter) && !strings.EqualFold(c.Author.Name, authorFilter) {
				return nil
			}
		}

		totalFound++

		// 檢查上限
		if totalFound > maxCommitsPerImport {
			return errOverLimit
		}

		hash := c.Hash.String()
		shortHash := hash[:7]
		message := strings.TrimSpace(c.Message)
		subject := extractSubject(message)

		// 略過 merge commit
		if c.NumParents() > 1 {
			skippedReasons = append(skippedReasons, dto.SkippedReason{
				CommitHash: shortHash,
				Reason:     "merge commit",
			})
			return nil
		}

		// 略過短 message
		if utf8.RuneCountInString(message) < 10 {
			skippedReasons = append(skippedReasons, dto.SkippedReason{
				CommitHash: shortHash,
				Reason:     "message too short (< 10 chars)",
			})
			return nil
		}

		commits = append(commits, commitInfo{
			Hash:     hash,
			Short:    shortHash,
			Subject:  subject,
			Message:  message,
			RepoName: repoName,
			RepoPath: req.RepoPath,
		})

		return nil
	})

	// 處理遍歷結果
	if iterErr != nil {
		if errors.Is(iterErr, errOverLimit) {
			return nil, model.NewAppError(400, model.ErrCodeInvalidInput,
				fmt.Sprintf("指定範圍內的 commits 超過 %d 筆上限，請縮小日期範圍", maxCommitsPerImport))
		}
		if !errors.Is(iterErr, errBreakEarly) {
			slog.Warn("遍歷 commit log 時發生錯誤", "error", iterErr)
		}
	}

	// 建立 entries（含去重）
	entriesCreated := 0

	for _, ci := range commits {
		// 去重：檢查 source_type="git" + source_ref=hash 是否已存在
		exists, err := s.entryRepo.ExistsBySourceRef(ctx, "git", ci.Hash)
		if err != nil {
			slog.Error("檢查去重失敗", "hash", ci.Short, "error", err)
			continue
		}
		if exists {
			skippedReasons = append(skippedReasons, dto.SkippedReason{
				CommitHash: ci.Short,
				Reason:     "already imported",
			})
			continue
		}

		// 建立 entry
		title := fmt.Sprintf("[Git] %s - %s", ci.Short, ci.Subject)
		content := ci.Message
		sourceType := "git"
		sourceRef := ci.Hash
		source := ci.RepoPath
		tags := []string{"git", "commit", ci.RepoName}

		now := time.Now().UTC()
		entry := &model.Entry{
			ID:         uuid.New(),
			Title:      &title,
			Content:    &content,
			CategoryID: nil,
			Source:     &source,
			SourceType: &sourceType,
			SourceRef:  &sourceRef,
			Tags:       tags,
			IsArchived: false,
			CreatedAt:  now,
			UpdatedAt:  now,
		}

		if err := s.entryRepo.Create(ctx, entry); err != nil {
			slog.Error("建立 entry 失敗", "hash", ci.Short, "error", err)
			if appErr, ok := err.(*model.AppError); ok && appErr.Code == model.ErrCodeDuplicateSource {
				skippedReasons = append(skippedReasons, dto.SkippedReason{
					CommitHash: ci.Short,
					Reason:     "already imported",
				})
			}
			continue
		}

		entriesCreated++
	}

	// 計算 skipped 中屬於 "already imported" 的數量
	entriesSkipped := 0
	for _, sr := range skippedReasons {
		if sr.Reason == "already imported" {
			entriesSkipped++
		}
	}

	return &dto.GitImportResponse{
		CommitsFound:   totalFound,
		EntriesCreated: entriesCreated,
		EntriesSkipped: entriesSkipped,
		SkippedReasons: skippedReasons,
	}, nil
}

// parseTimeRange 解析 since/until 時間參數
func parseTimeRange(sinceStr, untilStr *string) (time.Time, time.Time, error) {
	var since, until time.Time

	if sinceStr != nil && *sinceStr != "" {
		parsed, err := time.Parse(time.RFC3339, *sinceStr)
		if err != nil {
			return since, until, model.NewAppError(400, model.ErrCodeInvalidInput, "since 格式無效，須為 ISO 8601（例：2024-01-01T00:00:00Z）")
		}
		since = parsed
	} else {
		since = time.Now().UTC().AddDate(0, 0, -defaultSinceDays)
	}

	if untilStr != nil && *untilStr != "" {
		parsed, err := time.Parse(time.RFC3339, *untilStr)
		if err != nil {
			return since, until, model.NewAppError(400, model.ErrCodeInvalidInput, "until 格式無效，須為 ISO 8601（例：2024-01-31T23:59:59Z）")
		}
		until = parsed
	} else {
		until = time.Now().UTC()
	}

	return since, until, nil
}

// extractSubject 從 commit message 取得第一行（subject）
func extractSubject(message string) string {
	lines := strings.SplitN(message, "\n", 2)
	subject := strings.TrimSpace(lines[0])
	// 截斷過長的 subject（title 上限 100 字，扣掉 "[Git] abc1234 - " 的 18 字）
	if utf8.RuneCountInString(subject) > 80 {
		runes := []rune(subject)
		subject = string(runes[:77]) + "..."
	}
	return subject
}

// validateRepoPath 驗證 repo_path 是否在白名單允許的路徑範圍內
func (s *GitImportService) validateRepoPath(repoPath string) error {
	// 白名單為空時允許所有路徑（向下相容）
	if len(s.allowedRepoPaths) == 0 {
		return nil
	}

	// 先清理路徑（防止 .. 目錄遍歷）
	cleanPath := filepath.Clean(repoPath)

	for _, allowed := range s.allowedRepoPaths {
		allowedClean := filepath.Clean(allowed)
		// 檢查 cleanPath 是否在 allowedClean 目錄下
		if strings.HasPrefix(cleanPath, allowedClean+string(filepath.Separator)) || cleanPath == allowedClean {
			return nil
		}
	}

	return model.NewAppError(403, model.ErrCodeInvalidInput, "repo_path 不在允許的路徑範圍內")
}
