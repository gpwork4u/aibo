package service_test

import (
	"testing"

	"github.com/gpwork4u/aibo/service"
)

func TestDetectEmail(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, warnings := qc.Check("請聯繫 user@example.com 取得更多資訊")

	if len(flags) == 0 {
		t.Fatal("應偵測到 email pattern")
	}
	found := false
	for _, f := range flags {
		if f.Pattern == "email" && f.Type == "pii_detected" {
			found = true
			break
		}
	}
	if !found {
		t.Error("flags 中應包含 email pattern")
	}
	if len(warnings) == 0 {
		t.Error("warnings 不應為空")
	}
}

func TestDetectTaiwanID(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.Check("身分證字號 A123456789")

	found := false
	for _, f := range flags {
		if f.Pattern == "taiwan_id" && f.Type == "pii_detected" {
			found = true
			break
		}
	}
	if !found {
		t.Error("應偵測到台灣身分證 pattern")
	}
}

func TestDetectTaiwanPhone(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.Check("手機號碼 0912345678")

	found := false
	for _, f := range flags {
		if f.Pattern == "taiwan_phone" && f.Type == "pii_detected" {
			found = true
			break
		}
	}
	if !found {
		t.Error("應偵測到台灣手機 pattern")
	}
}

func TestDetectCreditCard(t *testing.T) {
	qc := service.NewQualityChecker()

	tests := []struct {
		name    string
		content string
	}{
		{"with dashes", "信用卡號 1234-5678-9012-3456"},
		{"with spaces", "信用卡號 1234 5678 9012 3456"},
		{"no separator", "信用卡號 1234567890123456"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flags, _ := qc.Check(tt.content)
			found := false
			for _, f := range flags {
				if f.Pattern == "credit_card" {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("應偵測到信用卡 pattern: %s", tt.content)
			}
		})
	}
}

func TestDetectIPAddress(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.Check("伺服器 IP 為 192.168.1.1")

	found := false
	for _, f := range flags {
		if f.Pattern == "ip_address" && f.Severity == "info" {
			found = true
			break
		}
	}
	if !found {
		t.Error("應偵測到 IP address pattern")
	}
}

func TestDetectAWSKey(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.Check("AWS key: AKIAIOSFODNN7EXAMPLE")

	found := false
	for _, f := range flags {
		if f.Pattern == "aws_key" && f.Type == "secret_detected" && f.Severity == "critical" {
			found = true
			break
		}
	}
	if !found {
		t.Error("應偵測到 AWS key pattern，且 severity 應為 critical")
	}
}

func TestDetectPrivateKey(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.Check("-----BEGIN RSA PRIVATE KEY-----\nMIIEpA...")

	found := false
	for _, f := range flags {
		if f.Pattern == "private_key" && f.Type == "secret_detected" {
			found = true
			break
		}
	}
	if !found {
		t.Error("應偵測到 private key pattern")
	}
}

func TestDetectJWT(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.Check("Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def456")

	found := false
	for _, f := range flags {
		if f.Pattern == "jwt" && f.Type == "secret_detected" {
			found = true
			break
		}
	}
	if !found {
		t.Error("應偵測到 JWT pattern")
	}
}

func TestDetectGenericAPIKey(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.Check("API key: sk-abcdefghijklmnopqrstuvwx")

	found := false
	for _, f := range flags {
		if f.Pattern == "generic_api_key" && f.Type == "secret_detected" {
			found = true
			break
		}
	}
	if !found {
		t.Error("應偵測到 generic API key pattern")
	}
}

func TestNoDetection_CleanContent(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, warnings := qc.Check("這是一篇關於 Go 語言的技術文章，內容包括 goroutine 和 channel 的使用方式。")

	if len(flags) != 0 {
		t.Errorf("乾淨內容不應有 flags，但偵測到 %d 個", len(flags))
	}
	if len(warnings) != 0 {
		t.Errorf("乾淨內容不應有 warnings，但偵測到 %d 個", len(warnings))
	}
}

func TestMultipleDetections(t *testing.T) {
	qc := service.NewQualityChecker()
	content := "聯繫 admin@example.com，伺服器 192.168.1.100，AWS key: AKIAIOSFODNN7EXAMPLE"
	flags, warnings := qc.Check(content)

	if len(flags) < 3 {
		t.Errorf("應至少偵測到 3 種 pattern，實際偵測到 %d 種", len(flags))
	}
	if len(warnings) < 3 {
		t.Errorf("應至少有 3 個 warnings，實際 %d 個", len(warnings))
	}

	// 檢查是否包含所有預期 pattern
	patterns := make(map[string]bool)
	for _, f := range flags {
		patterns[f.Pattern] = true
	}
	expected := []string{"email", "ip_address", "aws_key"}
	for _, p := range expected {
		if !patterns[p] {
			t.Errorf("應偵測到 %s pattern", p)
		}
	}
}

func TestSummaryTooShort(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, warnings := qc.CheckSummaryLength("短")

	if len(flags) == 0 {
		t.Fatal("summary 太短應產生 flag")
	}
	if flags[0].Pattern != "summary_too_short" {
		t.Errorf("pattern 應為 summary_too_short，實際為 %s", flags[0].Pattern)
	}
	if len(warnings) == 0 {
		t.Error("應有 warning")
	}
}

func TestSummaryTooLong(t *testing.T) {
	qc := service.NewQualityChecker()
	longSummary := ""
	for i := 0; i < 210; i++ {
		longSummary += "字"
	}
	flags, _ := qc.CheckSummaryLength(longSummary)

	if len(flags) == 0 {
		t.Fatal("summary 太長應產生 flag")
	}
	if flags[0].Pattern != "summary_too_long" {
		t.Errorf("pattern 應為 summary_too_long，實際為 %s", flags[0].Pattern)
	}
}

func TestSummaryNormalLength(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, warnings := qc.CheckSummaryLength("這是一段正常長度的摘要，大約二十幾個字左右。")

	if len(flags) != 0 {
		t.Errorf("正常 summary 不應有 flags，但偵測到 %d 個", len(flags))
	}
	if len(warnings) != 0 {
		t.Errorf("正常 summary 不應有 warnings，但偵測到 %d 個", len(warnings))
	}
}

func TestSummaryEmpty(t *testing.T) {
	qc := service.NewQualityChecker()
	flags, _ := qc.CheckSummaryLength("")

	if len(flags) != 0 {
		t.Errorf("空 summary 不應產生 flag（空字串代表未產生 summary）")
	}
}
