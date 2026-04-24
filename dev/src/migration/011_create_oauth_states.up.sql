CREATE TABLE oauth_states (
    state VARCHAR(64) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_states_created_at ON oauth_states (created_at);
