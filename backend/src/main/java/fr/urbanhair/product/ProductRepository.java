package fr.urbanhair.product;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ProductRepository {
    private static final String SELECT = "SELECT * FROM products";
    private static final RowMapper<ProductRecord> MAPPER = (result, row) -> new ProductRecord(
            result.getString("id"), result.getString("name"), result.getString("category"),
            result.getString("description"), result.getBigDecimal("price"),
            result.getBigDecimal("promotion_price"), result.getString("sku"),
            result.getString("brand"), result.getString("product_format"),
            result.getObject("stock_quantity", Integer.class), result.getBoolean("published"),
            result.getBoolean("featured"), result.getInt("sort_order"),
            result.getString("image_key"), result.getString("image_url"));

    private final JdbcTemplate jdbc;

    public ProductRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ProductRecord> findPublished() {
        return jdbc.query(SELECT + " WHERE published = TRUE ORDER BY featured DESC, sort_order, created_at DESC, id", MAPPER);
    }

    public List<ProductRecord> findAll() {
        return jdbc.query(SELECT + " ORDER BY sort_order, created_at DESC, id", MAPPER);
    }

    public Optional<ProductRecord> findById(String id) {
        return jdbc.query(SELECT + " WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public Optional<ProductRecord> findByIdForUpdate(String id) {
        return jdbc.query(SELECT + " WHERE id = ? FOR UPDATE", MAPPER, id).stream().findFirst();
    }

    public int reservedQuantity(String id) {
        Integer reserved = jdbc.queryForObject(
                "SELECT reserved_quantity FROM products WHERE id = ?", Integer.class, id);
        return reserved == null ? 0 : reserved;
    }

    public boolean reserveStock(String id, int quantity) {
        return jdbc.update("""
                UPDATE products SET reserved_quantity = reserved_quantity + ?
                WHERE id = ? AND (stock_quantity IS NULL OR stock_quantity - reserved_quantity >= ?)
                """, quantity, id, quantity) == 1;
    }

    public void releaseReservedStock(String id, int quantity) {
        jdbc.update("""
                UPDATE products SET reserved_quantity = reserved_quantity - ?
                WHERE id = ? AND reserved_quantity >= ?
                """, quantity, id, quantity);
    }

    public boolean commitReservedStock(String id, int quantity) {
        return jdbc.update("""
                UPDATE products
                SET stock_quantity = stock_quantity - ?, reserved_quantity = reserved_quantity - ?
                WHERE id = ? AND stock_quantity IS NOT NULL
                    AND stock_quantity >= ? AND reserved_quantity >= ?
                """, quantity, quantity, id, quantity, quantity) == 1;
    }

    public boolean hasReservations(String id) {
        return reservedQuantity(id) > 0;
    }

    public boolean canSetStock(String id, Integer stockQuantity) {
        int reserved = reservedQuantity(id);
        return reserved == 0 || (stockQuantity != null && stockQuantity >= reserved);
    }

    public boolean skuExists(String sku, String exceptId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM products WHERE sku = ? AND id <> ?",
                Integer.class, sku, exceptId == null ? "" : exceptId);
        return count != null && count > 0;
    }

    @Transactional
    public void insert(ProductRecord product) {
        jdbc.update("""
                INSERT INTO products
                    (id, name, category, description, price, promotion_price, sku, brand,
                     product_format, stock_quantity, published, featured, sort_order, image_key, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                product.id(), product.name(), product.category(), product.description(), product.price(),
                product.promotionPrice(), product.sku(), product.brand(), product.productFormat(),
                product.stockQuantity(), product.published(), product.featured(), nextSortOrder(),
                product.imageKey(), product.imageUrl());
    }

    public int update(ProductRecord product) {
        return jdbc.update("""
                UPDATE products
                SET name = ?, category = ?, description = ?, price = ?, promotion_price = ?, sku = ?,
                    brand = ?, product_format = ?, stock_quantity = ?, published = ?, featured = ?,
                    image_key = ?, image_url = ?
                WHERE id = ? AND (reserved_quantity = 0 OR COALESCE(?, -1) >= reserved_quantity)
                """,
                product.name(), product.category(), product.description(), product.price(),
                product.promotionPrice(), product.sku(), product.brand(), product.productFormat(),
                product.stockQuantity(), product.published(), product.featured(), product.imageKey(),
                product.imageUrl(), product.id(), product.stockQuantity());
    }

    public int delete(String id) {
        return jdbc.update("DELETE FROM products WHERE id = ? AND reserved_quantity = 0", id);
    }

    @Transactional
    public void reorder(List<String> ids) {
        if (ids.isEmpty()) return;
        List<Object[]> batch = new ArrayList<>(ids.size());
        for (int index = 0; index < ids.size(); index++) {
            batch.add(new Object[] { index, ids.get(index) });
        }
        jdbc.batchUpdate("UPDATE products SET sort_order = ? WHERE id = ?", batch);
    }

    public boolean containsAllIds(List<String> ids) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM products", Integer.class);
        if (count == null || count != ids.size()) return false;
        if (ids.isEmpty()) return true;
        List<String> storedIds = jdbc.queryForList("SELECT id FROM products", String.class);
        return storedIds.containsAll(ids);
    }

    @Transactional
    public void seedLegacyCatalog() {
        Integer initialized = jdbc.queryForObject(
                "SELECT COUNT(*) FROM product_catalog_migrations WHERE migration_id = ?",
                Integer.class, "legacy-products-v1");
        if (initialized != null && initialized > 0) return;

        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM products", Integer.class);
        if (count != null && count == 0) {
            insertLegacy("rituel-nourrissant", "Rituel nourrissant", "Soin · Cheveux secs",
                    "Un soin riche pour nourrir les longueurs.", "32.00",
                    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80", 0);
            insertLegacy("shampooing-douceur", "Shampooing douceur", "Lavage · Tous types",
                    "Une base douce pour le rituel quotidien.", "24.00",
                    "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80", 1);
            insertLegacy("huile-finition", "Huile de finition", "Coiffage · Brillance",
                    "Quelques gouttes pour des longueurs lumineuses.", "28.00",
                    "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=80", 2);
        }
        jdbc.update("INSERT INTO product_catalog_migrations (migration_id) VALUES (?)", "legacy-products-v1");
    }

    private void insertLegacy(String id, String name, String category, String description,
            String price, String imageUrl, int sortOrder) {
        jdbc.update("""
                INSERT INTO products
                    (id, name, category, description, price, published, featured, sort_order, image_url)
                VALUES (?, ?, ?, ?, ?, TRUE, FALSE, ?, ?)
                """, id, name, category, description, new java.math.BigDecimal(price), sortOrder, imageUrl);
    }

    private int nextSortOrder() {
        Integer current = jdbc.queryForObject("SELECT COALESCE(MAX(sort_order), -1) FROM products", Integer.class);
        return current == null ? 0 : current + 1;
    }
}
