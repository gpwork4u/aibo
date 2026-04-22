# F-008: Git 整合

## Status: active
## Sprint: 3
## Priority: P2

## 使用者故事

As a 開發者，I want 將 Git commit 紀錄匯入知識庫，so that 我能記錄和搜尋我的開發歷程。

## API Contract

### `POST /api/v1/import/git`

Auth：X-API-Key header

同步匯入 Git commits 為知識條目。

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| repo_path | string | yes | 本機 Git repo 的絕對路徑 |
| since | string (ISO 8601) | no | 預設 7 天前 |
| until | string (ISO 8601) | no | 預設 now |
| author | string | no | 過濾作者（email 或 name） |
| branch | string | no | 指定分支，預設當前分支 |

Response 200:
```json
{
  "commits_found": 50,
  "entries_created": 45,
  "entries_skipped": 5,
  "skipped_reasons": [
    { "commit_hash": "abc1234", "reason": "merge commit" },
    { "commit_hash": "def5678", "reason": "message too short (< 10 chars)" }
  ]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | repo_path 為空 |
| 400 | INVALID_INPUT | repo_path 不是有效的 Git repo |
| 400 | INVALID_INPUT | since/until 格式無效 |
| 400 | INVALID_INPUT | commits 超過 500 筆上限 |
| 401 | UNAUTHORIZED | API Key 無效或缺失 |

## Data Model

無額外 data model。Git commits 匯入為 Entry，使用以下欄位對應：

| Entry Field | Git 來源 |
|-------------|---------|
| title | `[Git] {hash前7碼} - {commit subject}` |
| content | commit full message |
| tags | `["git", "commit", "{repo名稱}"]` |
| source_type | `"git"` |
| source_ref | commit hash (full SHA) |
| source | repo_path |

## Business Rules

1. 去重：以 source_ref (commit hash) 判斷，已存在的 commit 不重複匯入
2. 略過：merge commits（多個 parent）
3. 略過：commit message 少於 10 個字元
4. 單次匯入上限：500 commits，超過回 400 錯誤
5. since 未指定時預設為 7 天前
6. until 未指定時預設為 now
7. repo_path 必須是本機可存取的 Git repository
8. 匯入為同步操作（非背景）
9. 匯入的 entry 無 category_id（進入 Inbox），可透過 LLM 自動分類處理

## Scenarios

### Happy Path

#### Scenario: 匯入 Git commits
GIVEN 使用者已認證
AND "/home/user/project" is a valid Git repo with 10 commits in last 7 days
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project" }
THEN response status = 200
AND response body commits_found = 10
AND entries_created >= 1
AND 新建的 entries 有 source_type = "git"

#### Scenario: 指定日期範圍匯入
GIVEN 使用者已認證
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project", "since": "2024-01-01T00:00:00Z", "until": "2024-01-31T23:59:59Z" }
THEN response status = 200
AND 只匯入指定範圍內的 commits

#### Scenario: 指定 author 過濾
GIVEN 使用者已認證
AND repo has commits from "alice@example.com" and "bob@example.com"
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project", "author": "alice@example.com" }
THEN response status = 200
AND 只匯入 alice 的 commits

#### Scenario: 重複匯入時跳過已存在的
GIVEN 第一次匯入已建立 10 entries
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project" } (same params)
THEN response status = 200
AND entries_created = 0
AND entries_skipped = 10

### Error Handling

#### Scenario: repo_path 為空
GIVEN 使用者已認證
WHEN POST /api/v1/import/git with { "repo_path": "" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: repo_path 不是 Git repo
GIVEN 使用者已認證
WHEN POST /api/v1/import/git with { "repo_path": "/tmp/not-a-repo" }
THEN response status = 400
AND response body code = "INVALID_INPUT"

#### Scenario: 超過 500 commits 上限
GIVEN repo has 600 commits in date range
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project", "since": "2020-01-01T00:00:00Z" }
THEN response status = 400
AND response body code = "INVALID_INPUT"
AND response body message mentions 500 limit

#### Scenario: 未認證
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project" } without X-API-Key header
THEN response status = 401
AND response body code = "UNAUTHORIZED"

### Edge Cases

#### Scenario: 略過 merge commits
GIVEN repo has 5 regular commits and 2 merge commits
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project" }
THEN response status = 200
AND entries_skipped includes 2 with reason "merge commit"

#### Scenario: 略過短 message commits
GIVEN repo has a commit with message "fix"
WHEN POST /api/v1/import/git
THEN entries_skipped includes that commit with reason "message too short (< 10 chars)"

#### Scenario: repo 在指定日期範圍內無 commits
GIVEN repo has no commits between since and until
WHEN POST /api/v1/import/git with { "repo_path": "/home/user/project", "since": "2099-01-01T00:00:00Z" }
THEN response status = 200
AND commits_found = 0
AND entries_created = 0

#### Scenario: Entry title 格式
GIVEN commit hash = "abc1234567890" and subject = "Add user authentication"
WHEN commit is imported
THEN entry.title = "[Git] abc1234 - Add user authentication"
AND entry.tags = ["git", "commit", "{repo名稱}"]
AND entry.source_type = "git"
AND entry.source_ref = "abc1234567890..."
