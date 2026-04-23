# F-019: 品質檢測（VIBE 簡化版）

## 功能描述

在 LLM 分類流程中加入品質檢測層，偵測使用者送入的內容是否包含 PII（個人可識別資訊）或敏感資訊。偵測到時不阻擋分類，但在回應中附加警告標記，並在 entry 上記錄 flag。

## 使用者故事

As a system operator, I want the system to detect PII/sensitive information in knowledge entries, so that I am aware of potential data exposure risks.

## 設計原則

- **不阻擋**：偵測到 PII 不拒絕寫入，僅標記警告
- **本地優先**：使用 regex pattern matching 做第一層快速偵測，不額外呼叫 LLM
- **可擴展**：未來可加入 LLM-based 深度檢測作為第二層

## API Contract

無新增 API endpoint。品質檢測結果附加在現有分類回應中。

### 分類回應新增欄位

```json
{
  "entry_id": "uuid",
  "category": "...",
  "quality_warnings": [
    {
      "type": "pii_detected",
      "details": "email address pattern found",
      "severity": "warning"
    }
  ]
}
```

## Data Model

### entries 表新增欄位

```sql
ALTER TABLE entries ADD COLUMN quality_flags JSONB DEFAULT '[]';
```

quality_flags 結構：
```json
[
  {
    "type": "pii_detected",
    "pattern": "email",
    "detected_at": "2026-04-22T00:00:00Z"
  }
]
```

## PII 偵測 Pattern

### 第一層：Regex Pattern Matching

| 類型 | Pattern | 範例 |
|------|---------|------|
| Email | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | user@example.com |
| 台灣身分證 | `[A-Z][12]\d{8}` | A123456789 |
| 台灣手機 | `09\d{8}` | 0912345678 |
| 信用卡 | `\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b` | 1234-5678-9012-3456 |
| IP 位址 | `\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b` | 192.168.1.1 |
| AWS Key | `AKIA[0-9A-Z]{16}` | AKIAIOSFODNN7EXAMPLE |
| Private Key | `-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----` | PEM private key |
| JWT | `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` | JWT token |

## Scenarios

### WHEN 使用者建立 entry 且內容包含 email 地址
- THEN entry 正常建立並分類
- THEN entry.quality_flags 記錄 `[{"type": "pii_detected", "pattern": "email", ...}]`
- THEN 分類回應包含 quality_warnings

### WHEN 使用者建立 entry 且內容包含信用卡號碼
- THEN entry 正常建立並分類
- THEN entry.quality_flags 記錄偵測結果

### WHEN 使用者建立 entry 且內容不含任何敏感資訊
- THEN entry 正常建立並分類
- THEN entry.quality_flags 為空陣列 `[]`
- THEN 分類回應不包含 quality_warnings

### WHEN 使用者建立 entry 且內容包含 AWS Key pattern
- THEN entry 正常建立
- THEN quality_flags 記錄 `{"type": "secret_detected", "pattern": "aws_key", ...}`

### WHEN 偵測到多種 PII 類型
- THEN quality_flags 包含所有偵測結果（array）
- THEN severity 根據類型決定（secret > pii）

## 實作指引

### 需要建立/修改的檔案

#### 新增
- `dev/src/service/quality.go` -- QualityChecker 服務，regex pattern 匹配邏輯
- `dev/src/model/quality.go` -- QualityFlag struct 定義
- `dev/src/migration/009_add_quality_flags.up.sql` -- ALTER TABLE entries ADD COLUMN quality_flags
- `dev/src/migration/009_add_quality_flags.down.sql`

#### 修改
- `dev/src/service/classifier.go` -- ClassifyEntry 中加入品質檢測步驟
- `dev/src/dto/llm.go` -- ClassifyResult 新增 QualityWarnings 欄位
- `dev/src/handler/classify.go` -- 回應中包含 quality_warnings
- `dev/src/model/entry.go` -- Entry struct 新增 QualityFlags 欄位
- `dev/src/repository/entry.go` -- CRUD SQL 加入 quality_flags 欄位

### 關鍵邏輯

1. QualityChecker 在 ClassifyEntry 的最開始執行（分類前）
2. 檢測結果寫入 entry.quality_flags（JSONB）
3. 不影響分類流程 -- 即使偵測到 PII 也繼續分類
4. Pattern 定義為 slice of struct，方便未來擴展

```go
type PatternRule struct {
    Type     string         // "pii_detected" | "secret_detected"
    Pattern  string         // pattern name: "email", "credit_card", etc.
    Regex    *regexp.Regexp
    Severity string         // "info" | "warning" | "critical"
}
```

### Unit Tests
- `dev/__tests__/service/quality_test.go`
  - TestDetectEmail
  - TestDetectTaiwanID
  - TestDetectCreditCard
  - TestDetectAWSKey
  - TestDetectJWT
  - TestNoDetection_CleanContent
  - TestMultipleDetections
