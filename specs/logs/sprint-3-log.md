# Sprint 3 工作日誌：外部整合

## 完成日期
2026-04-23

## Sprint 目標
為 aibo 加入外部資料來源整合：Git commit 匯入和 Google Calendar 事件匯入。

## 技術選型（Sprint 3 補充）
| 用途 | 選擇 | 理由 |
|------|------|------|
| Git 操作 | go-git v5 | 純 Go 實作，無需系統 git binary |
| Google Calendar API | google.golang.org/api/calendar/v3 | 官方 Go client |
| Google OAuth2 | golang.org/x/oauth2 | 官方擴展庫，token 自動 refresh |

## 完成的功能

### F-008 Git 整合（PR #29）
- POST /api/v1/import/git — 同步匯入 commit messages
- go-git v5 打開本機 repo，遍歷 commit log
- 過濾：since/until、author、略過 merge commits、略過短訊息
- 去重：source_type="git" + source_ref=commit hash
- Entry 格式：[Git] hash_short - subject
- 上限 500 commits/次

### F-009 Google Calendar 整合（PR #28）
- POST /api/v1/integrations/gcal/auth — OAuth 授權
- GET /api/v1/integrations/gcal/callback — OAuth callback
- POST /api/v1/import/gcal — 同步匯入行事曆事件
- OAuth2 token 加密存儲（AES-256-GCM）
- Token 自動 refresh
- 去重：source_type="gcal" + source_ref=event ID
- DB migration：gcal_integrations table

### QA E2E Tests（PR #27）
- 24 個測試案例（F-008: 12 + F-009: 12）

## PRs 摘要
| PR | 標題 | 狀態 |
|----|------|------|
| #27 | Sprint 3 E2E Tests | 已合併 |
| #28 | F-009: Google Calendar 整合 | 已合併 |
| #29 | F-008: Git 整合 | 已合併 |

## Code Review 結果
| PR | 結論 | 關鍵發現 |
|----|------|---------|
| #29 | 可 approve | commits_found 語義可加註、repo_path 安全性文件說明 |
| #28 | 可 approve | SingleEvents 語義確認、UpdateTokens 型別建議 |

無 blocker，全數通過。

## 統計
- Features: 2（F-008, F-009）
- PRs: 3
- E2E Scenarios: 24 個
- 新增依賴: go-git, oauth2, google calendar api
