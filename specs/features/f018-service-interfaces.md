# F-018: Service Interface 化

## 功能描述

目前所有 Service 直接依賴 Repository 的 concrete struct（如 `*repository.EntryRepository`），導致 unit test 無法 mock repository 層。將 repository 依賴改為 interface，讓 service 層可以透過 interface 注入 mock 實作。

## 使用者故事

As a developer, I want service layer to depend on interfaces instead of concrete repository structs, so that I can write proper unit tests with mocks.

## 問題分析

### 現狀

```go
// service/classifier.go
type ClassifierService struct {
    llmSvc       *LlmService
    entryRepo    *repository.EntryRepository      // concrete struct
    categoryRepo *repository.CategoryRepository    // concrete struct
}
```

所有 service 都直接引用 `*repository.XxxRepository`，無法在 unit test 中替換為 mock。

### 目標

- 為每個 repository 定義 interface（在 service 層或獨立 package）
- Service 構造函式接收 interface 而非 concrete struct
- 既有 repository struct 自動滿足 interface（Go implicit interface）
- main.go 的 DI 接線不變（concrete struct 傳入 interface 參數）

## API Contract

無 API 變更，純內部重構。

## Data Model

無變更。

## Scenarios

### WHEN 定義 repository interface
- THEN interface 只包含 service 實際使用的方法（Interface Segregation）
- THEN 既有 repository struct 不需修改即可滿足 interface

### WHEN service 使用 interface 依賴
- THEN service 構造函式接收 interface 參數
- THEN 所有既有功能正常運作（行為不變）

### WHEN 撰寫 unit test
- THEN 可以用 struct mock 實作 interface
- THEN mock 可以控制回傳值和錯誤
- THEN 不需要 DB 連線即可測試 service 邏輯

### WHEN main.go 組裝依賴
- THEN 傳入 concrete repository struct 到 service 構造函式
- THEN 編譯通過，行為不變

## 實作指引

### 需要建立/修改的檔案

#### 新增 interface 定義
- `dev/src/service/interfaces.go` -- 所有 repository interface 集中定義

```go
package service

// EntryRepository defines the interface for entry data access.
type EntryRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*model.Entry, error)
    Create(ctx context.Context, entry *model.Entry) error
    Update(ctx context.Context, entry *model.Entry) error
    Delete(ctx context.Context, id uuid.UUID) error
    List(ctx context.Context, filter model.EntryFilter) (*model.EntryListResult, error)
    ExistsBySourceRef(ctx context.Context, sourceType, sourceRef string) (bool, error)
    CategoryExists(ctx context.Context, id uuid.UUID) (bool, error)
    ConfirmEntry(ctx context.Context, id uuid.UUID) (*model.Entry, error)
    FlagEntry(ctx context.Context, id uuid.UUID, reason string, note *string) (*model.Entry, *model.EntryFlag, error)
    GetFlags(ctx context.Context, entryID uuid.UUID) ([]model.EntryFlag, error)
}

type CategoryRepository interface {
    Create(ctx context.Context, cat *model.Category) error
    FindByID(ctx context.Context, id uuid.UUID) (*model.Category, error)
    List(ctx context.Context) ([]model.Category, error)
    Update(ctx context.Context, cat *model.Category) error
    Delete(ctx context.Context, id uuid.UUID) error
    ExistsByID(ctx context.Context, id uuid.UUID) (bool, error)
}

// ... 其他 repository interface
```

#### 修改 service 檔案
- `dev/src/service/classifier.go` -- 改用 EntryRepository / CategoryRepository interface
- `dev/src/service/entry.go` -- 改用 EntryRepository interface
- `dev/src/service/search.go` -- 改用 SearchRepository interface
- `dev/src/service/git_import.go` -- 改用 EntryRepository interface
- `dev/src/service/gcal.go` -- 改用 GcalIntegrationRepository / EntryRepository interface
- `dev/src/service/llm_provider.go` -- 改用 LlmProviderRepository interface
- `dev/src/service/category.go` -- 改用 CategoryRepository interface
- `dev/src/service/apikey.go` -- 改用 ApiKeyRepository interface
- `dev/src/service/stats.go` -- 改用 StatsRepository interface
- `dev/src/service/system.go` -- 改用 SystemRepository interface
- `dev/src/service/lifecycle.go` -- 改用 EntryRepository interface

#### 不需修改
- `dev/src/repository/*.go` -- concrete struct 不動，Go implicit interface 自動滿足
- `dev/src/main.go` -- 傳入 concrete struct，Go 自動轉為 interface

### 關鍵邏輯

1. Interface 定義在 service package（consumer 定義 interface，Go 慣例）
2. 每個 interface 只包含該 service 實際呼叫的方法
3. LlmProviderRepository interface 需包含 BeginTx / ClearDefault 等 transaction 方法
4. 修改順序：先定義 interface -> 逐個 service 修改 -> 確認編譯通過 -> 寫 mock test

### Unit Tests（示範）
- `dev/__tests__/service/classifier_test.go` -- 使用 mock repository 測試 ClassifyEntry 邏輯
  - TestClassifyEntry_Success
  - TestClassifyEntry_EntryNotFound
  - TestClassifyEntry_EmptyContent_Skip
  - TestClassifyEntry_LlmError_ReturnError
  - TestClassifyEntry_CategoryAutoCreate
