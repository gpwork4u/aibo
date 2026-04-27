package service

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	gogithub "github.com/google/go-github/v66/github"
	"github.com/gpwork4u/aibo/model"
	"golang.org/x/oauth2"
)

const (
	// githubCommitsMaxPerDay 每天最多回傳 commit 數量（spec 規定 200）
	githubCommitsMaxPerDay = 200

	// githubEventsMaxPages Activity events API 最多取的頁數（每頁 30 筆）
	githubEventsMaxPages = 10

	// githubEventsPerPage 每頁筆數
	githubEventsPerPage = 30

	// githubEventsTimeout events 階段 timeout（10s）
	githubEventsTimeout = 10 * time.Second

	// githubFallbackTimeout fallback 階段（per-repo）timeout（15s）
	githubFallbackTimeout = 15 * time.Second
)

// GithubCommit 單筆 commit 資訊
type GithubCommit struct {
	SHA         string    `json:"sha"`
	Repo        string    `json:"repo"`
	Message     string    `json:"message"`
	URL         string    `json:"url"`
	CommittedAt time.Time `json:"committed_at"`
	Additions   *int      `json:"additions"`
	Deletions   *int      `json:"deletions"`
}

// FetchMeta FetchCommits 的附帶元資料
type FetchMeta struct {
	Username  string
	Truncated bool
}

// GitHubCommitsService 負責從 GitHub API 取得使用者 commits
type GitHubCommitsService struct {
	integrationSvc *GitHubIntegrationService
}

// NewGitHubCommitsService 建立新的 GitHubCommitsService
func NewGitHubCommitsService(integrationSvc *GitHubIntegrationService) *GitHubCommitsService {
	return &GitHubCommitsService{
		integrationSvc: integrationSvc,
	}
}

// FetchCommits 取得指定時間範圍內的 GitHub commits
//
// 流程：
//  1. 從 integrationSvc 取得整合設定與明文 PAT
//  2. 建立 oauth2 HTTP client → GitHub client
//  3. 呼叫 Activity.ListEvents 最多 10 頁，過濾 PushEvent
//  4. 依 sinceUTC/untilUTC 篩選 commit
//  5. 若 events 達頁數上限（可能截斷），觸發 per-repo fallback
//  6. sha 去重，截斷至 200 筆
//  7. 成功後更新 last_synced_at；失敗後記錄 last_error
func (s *GitHubCommitsService) FetchCommits(ctx context.Context, sinceUTC, untilUTC time.Time) ([]GithubCommit, FetchMeta, error) {
	// 取得整合設定（包含 username 及 ID）
	_, integration, err := s.integrationSvc.GetStatus(ctx)
	if err != nil {
		return nil, FetchMeta{}, err
	}
	if integration == nil {
		return nil, FetchMeta{}, &model.AppError{
			Status:  http.StatusNotFound,
			Code:    model.ErrCodeGitHubNotConnected,
			Message: "尚未設定 GitHub 整合",
		}
	}

	// 解密 PAT（log 安全：不輸出明文）
	pat, err := s.integrationSvc.DecryptToken(ctx)
	if err != nil {
		return nil, FetchMeta{}, err
	}
	slog.Info("開始取得 GitHub commits",
		"username", integration.Username,
		"since", sinceUTC.Format(time.RFC3339),
		"until", utilSafeFormat(untilUTC),
		"token", redactToken(pat),
	)

	// 建立 oauth2 authenticated HTTP client（使用 base ctx，各階段獨立 timeout）
	ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: pat})
	httpClient := oauth2.NewClient(ctx, ts)
	client := gogithub.NewClient(httpClient)

	// events 階段：10s timeout
	eventsCtx, eventsCancel := context.WithTimeout(ctx, githubEventsTimeout)
	defer eventsCancel()

	// 取得 PushEvent commits（主路徑）
	commits, hitPageLimit, repoSet, err := s.fetchViaEvents(eventsCtx, client, integration.Username, sinceUTC, untilUTC)
	if err != nil {
		// 記錄 last_error
		_ = s.integrationSvc.repo.UpdateLastError(ctx, integration.ID, err.Error())
		return nil, FetchMeta{}, err
	}

	// 若 events 達頁數上限（可能截斷），觸發 per-repo fallback
	if hitPageLimit && len(repoSet) > 0 {
		slog.Info("Events 達頁數上限，觸發 per-repo fallback", "repos", len(repoSet))
		// fallback 階段：15s timeout（per-repo iterate 較慢）
		fallbackCtx, fallbackCancel := context.WithTimeout(ctx, githubFallbackTimeout)
		defer fallbackCancel()
		fallbackCommits, fallbackErr := s.fetchViaRepos(fallbackCtx, client, integration.Username, sinceUTC, untilUTC, repoSet)
		if fallbackErr != nil {
			slog.Warn("per-repo fallback 失敗，使用 events 資料", "error", fallbackErr)
		} else {
			commits = mergeDedupe(commits, fallbackCommits)
		}
	}

	// 截斷至 200 筆
	truncated := false
	if len(commits) > githubCommitsMaxPerDay {
		commits = commits[:githubCommitsMaxPerDay]
		truncated = true
	}

	// 成功：更新 last_synced_at
	if updateErr := s.integrationSvc.repo.UpdateLastSyncedAt(ctx, integration.ID); updateErr != nil {
		slog.Warn("更新 last_synced_at 失敗", "error", updateErr)
	}

	slog.Info("GitHub commits 取得完成",
		"username", integration.Username,
		"count", len(commits),
		"truncated", truncated,
	)

	return commits, FetchMeta{
		Username:  integration.Username,
		Truncated: truncated,
	}, nil
}

// fetchViaEvents 透過 Activity.ListEvents 取得 PushEvent commits
//
// 回傳：
//   - commits：在時間範圍內的 commits
//   - hitPageLimit：是否達到頁數上限（代表可能還有更多資料未取到）
//   - repoSet：此次 events 中涉及的所有 repo（owner/repo 格式）
func (s *GitHubCommitsService) fetchViaEvents(
	ctx context.Context,
	client *gogithub.Client,
	username string,
	sinceUTC, untilUTC time.Time,
) ([]GithubCommit, bool, map[string]bool, error) {
	var commits []GithubCommit
	repoSet := make(map[string]bool)
	hitPageLimit := false

	for page := 1; page <= githubEventsMaxPages; page++ {
		events, resp, err := client.Activity.ListEventsPerformedByUser(
			ctx,
			username,
			false, // includePublicOnly = false（取所有 public + private）
			&gogithub.ListOptions{
				Page:    page,
				PerPage: githubEventsPerPage,
			},
		)
		if err != nil {
			return nil, false, nil, mapGitHubError(err, resp)
		}

		if len(events) == 0 {
			break
		}

		// 追蹤最舊 event 時間，判斷是否超出 since 範圍
		// 必須對所有 event 類型判斷（不只 PushEvent），否則夾在其他類型事件中的
		// PushEvent 頁會被誤判成全部早於 since 而提早停止翻頁
		allBeforeSince := true
		for _, event := range events {
			createdAt := event.GetCreatedAt().Time
			if createdAt.After(sinceUTC) {
				allBeforeSince = false
			}

			if event.GetType() != "PushEvent" {
				continue
			}

			// 記錄涉及的 repo（用於 fallback）
			if event.Repo != nil {
				repoSet[event.Repo.GetName()] = true
			}

			// 提取 PushEvent payload 中的 commits
			payload, err := event.ParsePayload()
			if err != nil {
				slog.Warn("解析 PushEvent payload 失敗", "event_id", event.GetID(), "error", err)
				continue
			}

			pushPayload, ok := payload.(*gogithub.PushEvent)
			if !ok {
				continue
			}

			repoName := ""
			if event.Repo != nil {
				repoName = event.Repo.GetName()
			}

			for _, c := range pushPayload.Commits {
				// PushEvent payload 的 commits 沒有 timestamp，用 event.CreatedAt 近似（同一 push 內所有 commits 標同時間）
				committedAt := createdAt

				// 過濾不在時間範圍內的 commits
				if committedAt.Before(sinceUTC) || (!untilUTC.IsZero() && committedAt.After(untilUTC)) {
					continue
				}

				sha := c.GetSHA()
				if sha == "" {
					continue
				}

				url := fmt.Sprintf("https://github.com/%s/commit/%s", repoName, sha)

				// Additions / Deletions 在 events API 無法取得（保持 nil），由 fallback 補充
				commits = append(commits, GithubCommit{
					SHA:         sha,
					Repo:        repoName,
					Message:     c.GetMessage(),
					URL:         url,
					CommittedAt: committedAt,
				})
			}
		}

		// 若此頁所有 events 都早於 since，可以停止翻頁
		if allBeforeSince && page > 1 {
			break
		}

		// 若這是最後一頁且剛好達到頁數上限，標記為 hit
		if page == githubEventsMaxPages && len(events) == githubEventsPerPage {
			hitPageLimit = true
		}
	}

	return commits, hitPageLimit, repoSet, nil
}

// fetchViaRepos 對每個 repo 呼叫 Repositories.ListCommits 補齊資料（fallback）
func (s *GitHubCommitsService) fetchViaRepos(
	ctx context.Context,
	client *gogithub.Client,
	username string,
	sinceUTC, untilUTC time.Time,
	repoSet map[string]bool,
) ([]GithubCommit, error) {
	var commits []GithubCommit

	for repoFullName := range repoSet {
		// repoFullName 格式：owner/repo
		parts := strings.SplitN(repoFullName, "/", 2)
		if len(parts) != 2 {
			slog.Warn("無效的 repo 名稱格式", "repo", repoFullName)
			continue
		}
		owner, repoName := parts[0], parts[1]

		// 分頁取得所有 commits（避免只取第一頁造成遺漏）
		for page := 1; ; page++ {
			opts := &gogithub.CommitsListOptions{
				Author: username,
				Since:  sinceUTC,
				ListOptions: gogithub.ListOptions{
					Page:    page,
					PerPage: 100,
				},
			}
			if !untilUTC.IsZero() {
				opts.Until = untilUTC
			}

			repoCommits, resp, err := client.Repositories.ListCommits(ctx, owner, repoName, opts)
			if err != nil {
				slog.Warn("per-repo fallback 取得 commits 失敗",
					"repo", repoFullName,
					"page", page,
					"error", mapGitHubError(err, resp),
				)
				break
			}

				if len(repoCommits) == 0 {
				break
			}

			for _, rc := range repoCommits {
				sha := rc.GetSHA()
				if sha == "" {
					continue
				}

				committedAt := time.Time{}
				if rc.Commit != nil && rc.Commit.Author != nil && rc.Commit.Author.Date != nil {
					committedAt = rc.Commit.Author.Date.Time
				}

				// 過濾時間範圍
				if !committedAt.IsZero() {
					if committedAt.Before(sinceUTC) || (!untilUTC.IsZero() && committedAt.After(untilUTC)) {
						continue
					}
				}

				message := ""
				if rc.Commit != nil {
					message = rc.Commit.GetMessage()
				}

				var additions, deletions *int
				if rc.Stats != nil {
					a := rc.Stats.GetAdditions()
					d := rc.Stats.GetDeletions()
					additions = &a
					deletions = &d
				}

				url := rc.GetHTMLURL()
				if url == "" {
					url = fmt.Sprintf("https://github.com/%s/commit/%s", repoFullName, sha)
				}

				commits = append(commits, GithubCommit{
					SHA:         sha,
					Repo:        repoFullName,
					Message:     message,
					URL:         url,
					CommittedAt: committedAt,
					Additions:   additions,
					Deletions:   deletions,
				})
			}

			// 若此頁不足 100 筆，表示已無更多資料
			if len(repoCommits) < 100 {
				break
			}
		}
	}

	return commits, nil
}

// mergeDedupe 合併兩個 commit list 並以 SHA 去重（fallback 資料優先，因為有 additions/deletions）
func mergeDedupe(base, fallback []GithubCommit) []GithubCommit {
	seen := make(map[string]bool, len(base)+len(fallback))
	result := make([]GithubCommit, 0, len(base)+len(fallback))

	// 先加入 fallback（有 additions/deletions 資料），fallback 優先
	for _, c := range fallback {
		if !seen[c.SHA] {
			seen[c.SHA] = true
			result = append(result, c)
		}
	}

	// 再加入 base 中 fallback 沒有的
	for _, c := range base {
		if !seen[c.SHA] {
			seen[c.SHA] = true
			result = append(result, c)
		}
	}

	return result
}

// utilSafeFormat 安全格式化 time（zero time 回傳 "now"）
func utilSafeFormat(t time.Time) string {
	if t.IsZero() {
		return "now"
	}
	return t.Format(time.RFC3339)
}
