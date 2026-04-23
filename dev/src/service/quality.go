package service

import (
	"regexp"
	"time"
	"unicode/utf8"

	"github.com/gpwork4u/aibo/model"
)

// PatternRule 定義單一偵測規則
type PatternRule struct {
	Type     string         // "pii_detected" | "secret_detected"
	Pattern  string         // pattern 名稱: "email", "credit_card", etc.
	Regex    *regexp.Regexp
	Severity string         // "info" | "warning" | "critical"
	Details  string         // 人類可讀的說明
}

// QualityChecker 品質檢測服務
type QualityChecker struct {
	rules []PatternRule
}

// NewQualityChecker 建立品質檢測服務，初始化所有偵測規則
func NewQualityChecker() *QualityChecker {
	rules := []PatternRule{
		{
			Type:     "pii_detected",
			Pattern:  "email",
			Regex:    regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`),
			Severity: "warning",
			Details:  "email address pattern found",
		},
		{
			Type:     "pii_detected",
			Pattern:  "taiwan_id",
			Regex:    regexp.MustCompile(`[A-Z][12]\d{8}`),
			Severity: "warning",
			Details:  "Taiwan national ID pattern found",
		},
		{
			Type:     "pii_detected",
			Pattern:  "taiwan_phone",
			Regex:    regexp.MustCompile(`09\d{8}`),
			Severity: "warning",
			Details:  "Taiwan mobile phone pattern found",
		},
		{
			Type:     "pii_detected",
			Pattern:  "credit_card",
			Regex:    regexp.MustCompile(`\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b`),
			Severity: "warning",
			Details:  "credit card number pattern found",
		},
		{
			Type:     "pii_detected",
			Pattern:  "ip_address",
			Regex:    regexp.MustCompile(`\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`),
			Severity: "info",
			Details:  "IP address pattern found",
		},
		{
			Type:     "secret_detected",
			Pattern:  "aws_key",
			Regex:    regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
			Severity: "critical",
			Details:  "AWS access key pattern found",
		},
		{
			Type:     "secret_detected",
			Pattern:  "private_key",
			Regex:    regexp.MustCompile(`-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----`),
			Severity: "critical",
			Details:  "private key pattern found",
		},
		{
			Type:     "secret_detected",
			Pattern:  "jwt",
			Regex:    regexp.MustCompile(`eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`),
			Severity: "critical",
			Details:  "JWT token pattern found",
		},
		{
			Type:     "secret_detected",
			Pattern:  "generic_api_key",
			Regex:    regexp.MustCompile(`(sk-|pk_|api_key|token)[a-zA-Z0-9]{20,}`),
			Severity: "critical",
			Details:  "API key / token pattern found",
		},
	}

	return &QualityChecker{rules: rules}
}

// Check 對內容執行品質檢測，回傳所有偵測到的 flags 和 warnings
func (qc *QualityChecker) Check(content string) ([]model.QualityFlag, []model.QualityWarning) {
	now := time.Now().UTC()
	var flags []model.QualityFlag
	var warnings []model.QualityWarning

	// PII / Secret pattern 偵測
	for _, rule := range qc.rules {
		if rule.Regex.MatchString(content) {
			flags = append(flags, model.QualityFlag{
				Type:       rule.Type,
				Pattern:    rule.Pattern,
				Severity:   rule.Severity,
				DetectedAt: now,
			})
			warnings = append(warnings, model.QualityWarning{
				Type:     rule.Type,
				Details:  rule.Details,
				Severity: rule.Severity,
			})
		}
	}

	return flags, warnings
}

// CheckSummaryLength 檢測 summary 長度是否合理
func (qc *QualityChecker) CheckSummaryLength(summary string) ([]model.QualityFlag, []model.QualityWarning) {
	now := time.Now().UTC()
	var flags []model.QualityFlag
	var warnings []model.QualityWarning

	runeCount := utf8.RuneCountInString(summary)

	if summary != "" && runeCount < 10 {
		flags = append(flags, model.QualityFlag{
			Type:       "quality_issue",
			Pattern:    "summary_too_short",
			Severity:   "info",
			DetectedAt: now,
		})
		warnings = append(warnings, model.QualityWarning{
			Type:     "quality_issue",
			Details:  "summary is too short (< 10 characters)",
			Severity: "info",
		})
	}

	if runeCount > 200 {
		flags = append(flags, model.QualityFlag{
			Type:       "quality_issue",
			Pattern:    "summary_too_long",
			Severity:   "info",
			DetectedAt: now,
		})
		warnings = append(warnings, model.QualityWarning{
			Type:     "quality_issue",
			Details:  "summary is too long (> 200 characters)",
			Severity: "info",
		})
	}

	return flags, warnings
}
