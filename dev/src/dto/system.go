package dto

// SearchConfigResponse 搜尋配置資訊回應
type SearchConfigResponse struct {
	FTSConfig      string            `json:"fts_config"`
	Extensions     map[string]bool   `json:"extensions"`
	ChineseSupport string            `json:"chinese_support"`
}
