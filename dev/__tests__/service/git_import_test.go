package service_test

import (
	"context"
	"strings"
	"testing"

	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

func newGitImportSvcWithPaths(paths []string) *service.GitImportService {
	// 傳入 nil entryRepo — 白名單驗證在 DB 操作前就會被攔截
	svc := service.NewGitImportService(nil)
	if len(paths) > 0 {
		svc.SetAllowedRepoPaths(paths)
	}
	return svc
}

func TestGitImportService_RepoPathWhitelist_Blocked(t *testing.T) {
	svc := newGitImportSvcWithPaths([]string{"/home/user/repos", "/data/git"})

	req := dto.GitImportRequest{
		RepoPath: "/etc/passwd",
	}

	_, err := svc.ImportCommits(context.Background(), req)
	if err == nil {
		t.Fatal("預期應回傳錯誤，但沒有")
	}

	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際: %T", err)
	}
	if appErr.Status != 403 {
		t.Errorf("預期 status 403，實際: %d", appErr.Status)
	}
	if !strings.Contains(appErr.Message, "不在允許的路徑範圍內") {
		t.Errorf("錯誤訊息應包含路徑範圍提示，實際: %s", appErr.Message)
	}
}

func TestGitImportService_RepoPathWhitelist_Allowed(t *testing.T) {
	svc := newGitImportSvcWithPaths([]string{"/home/user/repos"})

	req := dto.GitImportRequest{
		RepoPath: "/home/user/repos/my-project",
	}

	// 路徑在白名單內，但不是真的 git repo，所以會得到 "不是有效的 Git repository" 錯誤
	_, err := svc.ImportCommits(context.Background(), req)
	if err == nil {
		t.Fatal("預期應回傳錯誤（非 git repo），但沒有")
	}

	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際: %T", err)
	}
	// 不應是 403（白名單錯誤），而是 400（非 git repo）
	if appErr.Status == 403 {
		t.Error("路徑在白名單內，不應回傳 403")
	}
}

func TestGitImportService_RepoPathWhitelist_DirectoryTraversal(t *testing.T) {
	svc := newGitImportSvcWithPaths([]string{"/home/user/repos"})

	req := dto.GitImportRequest{
		RepoPath: "/home/user/repos/../../../etc/passwd",
	}

	_, err := svc.ImportCommits(context.Background(), req)
	if err == nil {
		t.Fatal("預期應回傳錯誤，但沒有")
	}

	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際: %T", err)
	}
	if appErr.Status != 403 {
		t.Errorf("目錄遍歷攻擊應回傳 403，實際: %d", appErr.Status)
	}
}

func TestGitImportService_RepoPathWhitelist_EmptyAllowsAll(t *testing.T) {
	// 空白名單 = 允許所有路徑（不呼叫 SetAllowedRepoPaths）
	svc := service.NewGitImportService(nil)

	req := dto.GitImportRequest{
		RepoPath: "/any/path/here",
	}

	_, err := svc.ImportCommits(context.Background(), req)
	if err == nil {
		t.Fatal("預期應回傳錯誤（非 git repo），但沒有")
	}

	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際: %T", err)
	}
	// 不應是 403（允許所有路徑），而是 400（非 git repo）
	if appErr.Status == 403 {
		t.Error("空白名單應允許所有路徑，不應回傳 403")
	}
}

func TestGitImportService_RepoPathWhitelist_ExactMatch(t *testing.T) {
	svc := newGitImportSvcWithPaths([]string{"/home/user/repos/my-project"})

	req := dto.GitImportRequest{
		RepoPath: "/home/user/repos/my-project",
	}

	_, err := svc.ImportCommits(context.Background(), req)
	if err == nil {
		t.Fatal("預期應回傳錯誤（非 git repo），但沒有")
	}

	appErr, ok := err.(*model.AppError)
	if !ok {
		t.Fatalf("預期 AppError，實際: %T", err)
	}
	// 完全匹配應被允許
	if appErr.Status == 403 {
		t.Error("完全匹配的路徑應被允許，不應回傳 403")
	}
}
