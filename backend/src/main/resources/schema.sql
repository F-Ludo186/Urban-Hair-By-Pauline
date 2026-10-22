CREATE TABLE IF NOT EXISTS gallery_items (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    caption VARCHAR(2000) NOT NULL,
    category VARCHAR(40) NOT NULL,
    image_key VARCHAR(80) NOT NULL,
    instagram_url VARCHAR(500),
    published BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
