package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/dto"
	"github.com/gpwork4u/aibo/model"
)

// --- 測試 dto 結構序列化 ---

// TestCreateEntryLinkRequestSerialization 測試建立關聯請求的 JSON 解析
func TestCreateEntryLinkRequestSerialization(t *testing.T) {
	toID := uuid.New()
	lt := model.LinkTypeDerivesFrom
	rel := "基於概念延伸"
	conf := 0.95
	src := model.LinkSourceManual

	req := dto.CreateEntryLinkRequest{
		ToID:       toID,
		LinkType:   &lt,
		Relation:   &rel,
		Confidence: &conf,
		Source:     &src,
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var parsed dto.CreateEntryLinkRequest
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if parsed.ToID != toID {
		t.Errorf("to_id mismatch: got %s want %s", parsed.ToID, toID)
	}
	if parsed.LinkType == nil || *parsed.LinkType != lt {
		t.Errorf("link_type mismatch")
	}
	if parsed.Relation == nil || *parsed.Relation != rel {
		t.Errorf("relation mismatch")
	}
	if parsed.Confidence == nil || *parsed.Confidence != conf {
		t.Errorf("confidence mismatch")
	}
	if parsed.Source == nil || *parsed.Source != src {
		t.Errorf("source mismatch")
	}
}

// TestSelfLinkDetection 測試 handler 層 self-link 邏輯（不依賴 DB）
func TestSelfLinkDetection(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// 建立一個簡易 gin router 來驗證 self-link 422 回傳
	r := gin.New()
	r.POST("/entries/:id/links", func(c *gin.Context) {
		idStr := c.Param("id")
		fromID, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: model.ErrCodeInvalidInput, Message: "invalid id"})
			return
		}

		var req dto.CreateEntryLinkRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: model.ErrCodeInvalidInput, Message: err.Error()})
			return
		}

		// self-link check（同 entry_links.go 邏輯）
		if fromID == req.ToID {
			c.JSON(http.StatusUnprocessableEntity, dto.ErrorResponse{
				Code:    model.ErrCodeSelfLink,
				Message: "不允許自我關聯",
			})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"ok": true})
	})

	entryID := uuid.New()
	body := map[string]interface{}{
		"to_id":     entryID.String(),
		"link_type": "derives_from",
	}
	bodyBytes, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/entries/"+entryID.String()+"/links", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for self-link, got %d", w.Code)
	}

	var resp dto.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}
	if resp.Code != model.ErrCodeSelfLink {
		t.Errorf("expected code %s, got %s", model.ErrCodeSelfLink, resp.Code)
	}
}

// TestValidLinkTypes 測試 ValidLinkTypes 常數集合
func TestValidLinkTypes(t *testing.T) {
	validTypes := []model.LinkType{
		model.LinkTypeDerivesFrom,
		model.LinkTypeContradicts,
		model.LinkTypeDuplicateOf,
		model.LinkTypeReferences,
		model.LinkTypeSupersedes,
		model.LinkTypeRelatedTo,
	}

	for _, lt := range validTypes {
		if !model.ValidLinkTypes[lt] {
			t.Errorf("expected %s to be valid", lt)
		}
	}

	// 非法值
	invalid := model.LinkType("invalid_type")
	if model.ValidLinkTypes[invalid] {
		t.Errorf("expected %s to be invalid", invalid)
	}
}

// TestUpdateEntryLinkRequestPartial 測試 PATCH 部分更新結構
func TestUpdateEntryLinkRequestPartial(t *testing.T) {
	// 只更新 relation
	rel := "新的關係描述"
	req := dto.UpdateEntryLinkRequest{
		Relation: &rel,
	}

	if req.LinkType != nil {
		t.Error("link_type should be nil when not set")
	}
	if req.Relation == nil || *req.Relation != rel {
		t.Error("relation should match")
	}
	if req.Confidence != nil {
		t.Error("confidence should be nil when not set")
	}
}
