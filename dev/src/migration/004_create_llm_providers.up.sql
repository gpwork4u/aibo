CREATE TABLE IF NOT EXISTS llm_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(500) NULL,
    model_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    config JSONB NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- name case-insensitive unique
CREATE UNIQUE INDEX idx_llm_providers_name_lower ON llm_providers (LOWER(name));

-- 最多一個 default provider
CREATE UNIQUE INDEX idx_llm_providers_default ON llm_providers (is_default) WHERE is_default = TRUE;
