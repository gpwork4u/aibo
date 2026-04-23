package service_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/gpwork4u/aibo/model"
	"github.com/gpwork4u/aibo/service"
)

func TestGetOrCreateClient_CacheHit(t *testing.T) {
	svc := service.NewLlmService(nil, nil)

	providerID := uuid.New()
	provider := &model.LlmProvider{
		ID:          providerID,
		Name:        "test-provider",
		EndpointURL: "https://api.example.com",
		ModelName:   "gpt-4",
	}

	// 第一次呼叫應建立新 client
	addr1 := svc.WarmClient(provider, "test-key")
	if addr1 == "" {
		t.Fatal("WarmClient 應回傳非空的位址字串")
	}
	if svc.ClientCacheLen() != 1 {
		t.Errorf("快取大小應為 1，實際為 %d", svc.ClientCacheLen())
	}

	// 第二次呼叫應回傳相同的 client（cache hit）
	addr2 := svc.WarmClient(provider, "test-key")
	if addr1 != addr2 {
		t.Errorf("相同 provider + 相同設定應回傳同一個 cached client，但得到 %s vs %s", addr1, addr2)
	}
	if svc.ClientCacheLen() != 1 {
		t.Errorf("cache hit 後快取大小仍應為 1，實際為 %d", svc.ClientCacheLen())
	}
}

func TestGetOrCreateClient_CacheMiss(t *testing.T) {
	svc := service.NewLlmService(nil, nil)

	p1 := &model.LlmProvider{
		ID:          uuid.New(),
		Name:        "provider-1",
		EndpointURL: "https://api1.example.com",
		ModelName:   "gpt-4",
	}
	p2 := &model.LlmProvider{
		ID:          uuid.New(),
		Name:        "provider-2",
		EndpointURL: "https://api2.example.com",
		ModelName:   "gpt-4",
	}

	addr1 := svc.WarmClient(p1, "key-1")
	addr2 := svc.WarmClient(p2, "key-2")

	if addr1 == addr2 {
		t.Error("不同 provider 應回傳不同的 cached client")
	}
	if svc.ClientCacheLen() != 2 {
		t.Errorf("快取大小應為 2，實際為 %d", svc.ClientCacheLen())
	}
}

func TestInvalidateClient_RemovesFromCache(t *testing.T) {
	svc := service.NewLlmService(nil, nil)

	providerID := uuid.New()
	provider := &model.LlmProvider{
		ID:          providerID,
		Name:        "test-provider",
		EndpointURL: "https://api.example.com",
		ModelName:   "gpt-4",
	}

	addr1 := svc.WarmClient(provider, "test-key")
	if !svc.HasCachedClient(providerID) {
		t.Fatal("WarmClient 後應有快取")
	}

	// 清除快取
	svc.InvalidateClient(providerID)
	if svc.HasCachedClient(providerID) {
		t.Error("InvalidateClient 後不應有快取")
	}
	if svc.ClientCacheLen() != 0 {
		t.Errorf("InvalidateClient 後快取大小應為 0，實際為 %d", svc.ClientCacheLen())
	}

	// 再次取得，應建立新的 client
	addr2 := svc.WarmClient(provider, "test-key")
	if addr1 == addr2 {
		t.Error("InvalidateClient 後應建立新的 client 實例")
	}
}

func TestConfigChange_RecreatesClient(t *testing.T) {
	svc := service.NewLlmService(nil, nil)

	providerID := uuid.New()
	provider := &model.LlmProvider{
		ID:          providerID,
		Name:        "test-provider",
		EndpointURL: "https://api.example.com",
		ModelName:   "gpt-4",
	}

	// 使用 key-1 建立
	addr1 := svc.WarmClient(provider, "key-1")

	// 使用不同的 api key（模擬設定變更），configHash 不同應重建
	addr2 := svc.WarmClient(provider, "key-2")

	if addr1 == addr2 {
		t.Error("config 變更（不同 apiKey）後應建立新的 client")
	}
	// 快取大小仍為 1（舊的被替換）
	if svc.ClientCacheLen() != 1 {
		t.Errorf("config 變更後快取大小應為 1，實際為 %d", svc.ClientCacheLen())
	}
}
