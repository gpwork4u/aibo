package model

import "time"

// QualityFlag 品質檢測標記
type QualityFlag struct {
	Type       string    `json:"type"`        // "pii_detected" | "secret_detected"
	Pattern    string    `json:"pattern"`      // "email", "credit_card", "aws_key", etc.
	Severity   string    `json:"severity"`     // "info" | "warning" | "critical"
	DetectedAt time.Time `json:"detected_at"`
}

// QualityWarning 品質警告（用於 API 回應）
type QualityWarning struct {
	Type     string `json:"type"`
	Details  string `json:"details"`
	Severity string `json:"severity"`
}
