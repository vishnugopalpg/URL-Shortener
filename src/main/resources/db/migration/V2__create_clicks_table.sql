CREATE TABLE click (
    id          BIGSERIAL PRIMARY KEY,
    url_id      BIGINT NOT NULL REFERENCES url(id) ON DELETE CASCADE,
    clicked_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    referer     VARCHAR(500)
);

CREATE INDEX idx_click_url_id ON click(url_id);
