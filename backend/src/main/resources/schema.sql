CREATE TABLE IF NOT EXISTS gallery_items (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    caption VARCHAR(2000) NOT NULL,
    category VARCHAR(40) NOT NULL,
    image_key VARCHAR(80),
    instagram_url VARCHAR(500),
    published BOOLEAN NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS group_id VARCHAR(36);
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);
ALTER TABLE gallery_items ALTER COLUMN image_key DROP NOT NULL;

CREATE TABLE IF NOT EXISTS gallery_groups (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(2000) NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    cover_item_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gallery_groups ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gallery_groups ADD COLUMN IF NOT EXISTS cover_item_id VARCHAR(36);
ALTER TABLE gallery_groups ADD COLUMN IF NOT EXISTS description VARCHAR(2000) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS home_sections (
    id VARCHAR(20) PRIMARY KEY,
    eyebrow VARCHAR(120) NOT NULL DEFAULT '',
    title VARCHAR(240) NOT NULL,
    body VARCHAR(2000) NOT NULL DEFAULT '',
    link_label VARCHAR(120) NOT NULL DEFAULT '',
    link_url VARCHAR(500) NOT NULL DEFAULT '',
    signature VARCHAR(120) NOT NULL DEFAULT '',
    layout VARCHAR(40) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    image_key VARCHAR(80),
    image_url VARCHAR(1000)
);

INSERT INTO home_sections (id, eyebrow, title, body, link_label, link_url, signature, layout, sort_order, image_url)
SELECT 'hero', 'SALON DE COIFFURE · BEAUTÉ AU NATUREL', 'Révélez votre beauté singulière.', 'Une parenthèse de douceur, des gestes experts et une coiffure qui vous ressemble.', 'Découvrir le salon', 'mailto:bonjour@urbanhair.fr', '', 'hero', 0,
       'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=2000&q=85'
WHERE NOT EXISTS (SELECT 1 FROM home_sections WHERE id = 'hero');

INSERT INTO home_sections (id, eyebrow, title, body, link_label, link_url, signature, layout, sort_order)
SELECT 'intro', 'L’ESPRIT URBAN HAIR', 'La beauté prend son temps.', 'Chez Urban Hair by Pauline, chaque rendez-vous est une rencontre. Nous imaginons avec vous une coupe et une couleur qui révèlent votre personnalité, dans une atmosphère chaleureuse et apaisante.', 'Explorer nos réalisations', '/galerie', '', 'text', 1
WHERE NOT EXISTS (SELECT 1 FROM home_sections WHERE id = 'intro');

INSERT INTO home_sections (id, eyebrow, title, body, link_label, link_url, signature, layout, sort_order, image_url)
SELECT 'feature', 'LE SALON', 'Un savoir-faire tout en délicatesse.', 'Des conseils personnalisés, des produits soigneusement sélectionnés et une attention portée à chaque détail.', 'Voir la boutique', '/boutique', '', 'image-left', 2,
       'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1100&q=85'
WHERE NOT EXISTS (SELECT 1 FROM home_sections WHERE id = 'feature');

INSERT INTO home_sections (id, eyebrow, title, body, link_label, link_url, signature, layout, sort_order)
SELECT 'quote', '', '', 'Parce que se sentir bien dans ses cheveux, c’est déjà se sentir un peu plus soi.', '', '', 'PAULINE · FONDATRICE', 'centered', 3
WHERE NOT EXISTS (SELECT 1 FROM home_sections WHERE id = 'quote');

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description VARCHAR(2000) NOT NULL DEFAULT '',
    price DECIMAL(10, 2) NOT NULL,
    promotion_price DECIMAL(10, 2),
    sku VARCHAR(80) UNIQUE,
    brand VARCHAR(120),
    product_format VARCHAR(120),
    stock_quantity INTEGER,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    image_key VARCHAR(80),
    image_url VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS product_catalog_migrations (
    migration_id VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_settings (
    singleton_id INTEGER PRIMARY KEY,
    notification_email VARCHAR(254) NOT NULL,
    delivery_fee DECIMAL(8, 2),
    delivery_zone VARCHAR(120) NOT NULL,
    delivery_postal_prefixes VARCHAR(120) NOT NULL,
    pickup_address VARCHAR(500) NOT NULL,
    pickup_instructions VARCHAR(1000) NOT NULL
);

ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS delivery_postal_prefixes
    VARCHAR(120) NOT NULL DEFAULT '01-19,20,21-95';

CREATE TABLE IF NOT EXISTS customer_orders (
    id VARCHAR(36) PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    customer_name VARCHAR(160) NOT NULL,
    customer_email VARCHAR(254) NOT NULL,
    customer_phone VARCHAR(40) NOT NULL,
    fulfillment VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(200),
    postal_code VARCHAR(20),
    city VARCHAR(120),
    pickup_address VARCHAR(500),
    pickup_instructions VARCHAR(1000),
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(8, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    stripe_session_id VARCHAR(255) UNIQUE,
    idempotency_key VARCHAR(80) NOT NULL UNIQUE,
    notification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notification_attempts INTEGER NOT NULL DEFAULT 0,
    notification_error VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS pickup_address VARCHAR(500);
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS pickup_instructions VARCHAR(1000);

CREATE TABLE IF NOT EXISTS order_lines (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(80) NOT NULL,
    product_name VARCHAR(120) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    tracks_stock BOOLEAN NOT NULL,
    CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES customer_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_notification ON customer_orders(status, notification_status);
