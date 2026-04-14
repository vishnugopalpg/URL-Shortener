CREATE TABLE url (
    id           BIGSERIAL PRIMARY KEY,
    short_code   VARCHAR(20) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_id      BIGINT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMP,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_url_short_code ON url(short_code);
