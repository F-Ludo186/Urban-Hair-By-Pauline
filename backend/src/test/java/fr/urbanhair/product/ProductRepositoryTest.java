package fr.urbanhair.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@Import(ProductRepository.class)
class ProductRepositoryTest {
    @Autowired
    private ProductRepository repository;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void seedsLegacyProductsOnlyOnce() {
        repository.seedLegacyCatalog();

        assertThat(repository.findPublished())
                .extracting(ProductRecord::name)
                .containsExactly("Rituel nourrissant", "Shampooing douceur", "Huile de finition");

        jdbc.update("DELETE FROM products");
        repository.seedLegacyCatalog();

        assertThat(repository.findAll()).isEmpty();
    }

    @Test
    void savesProductFieldsAndReordersCatalog() {
        ProductRecord first = product("product-1", "SERUM-01", 0);
        ProductRecord second = product("product-2", "SERUM-02", 1);
        repository.insert(first);
        repository.insert(second);

        assertThat(repository.skuExists("SERUM-01", null)).isTrue();
        assertThat(repository.skuExists("SERUM-01", "product-1")).isFalse();
        assertThat(repository.findById("product-1"))
                .get()
                .satisfies(saved -> {
                    assertThat(saved.promotionPrice()).isEqualByComparingTo("18.50");
                    assertThat(saved.stockQuantity()).isEqualTo(4);
                    assertThat(saved.featured()).isTrue();
                    assertThat(saved.imageKey()).isEqualTo("image-key.jpg");
                });

        repository.reorder(List.of("product-2", "product-1"));

        assertThat(repository.findAll())
                .extracting(ProductRecord::id)
                .containsExactly("product-2", "product-1");
    }

    @Test
    void reservesStockUntilPaymentAndCommitsOnlyOncePaid() {
        repository.insert(product("product-stock", "STOCK-01", 0));

        assertThat(repository.reserveStock("product-stock", 3)).isTrue();
        assertThat(repository.reserveStock("product-stock", 2)).isFalse();
        assertThat(repository.reservedQuantity("product-stock")).isEqualTo(3);

        assertThat(repository.commitReservedStock("product-stock", 2)).isTrue();
        assertThat(repository.findById("product-stock")).get()
                .satisfies(saved -> assertThat(saved.stockQuantity()).isEqualTo(2));
        assertThat(repository.reservedQuantity("product-stock")).isEqualTo(1);
    }

    @Test
    void stockCannotBeReducedBelowOutstandingReservations() {
        repository.insert(product("product-reserved", "STOCK-02", 0));
        assertThat(repository.reserveStock("product-reserved", 3)).isTrue();

        ProductRecord tooLow = new ProductRecord(
                "product-reserved", "Sérum", "Soin", "Description produit",
                new BigDecimal("25.00"), new BigDecimal("18.50"), "STOCK-02",
                "Marque", "50 ml", 2, true, true, 0, "image-key.jpg", null);
        assertThat(repository.update(tooLow)).isZero();
        assertThat(repository.findById("product-reserved")).get()
                .satisfies(saved -> assertThat(saved.stockQuantity()).isEqualTo(4));
    }

    private ProductRecord product(String id, String sku, int sortOrder) {
        return new ProductRecord(
                id, "Sérum", "Soin", "Description produit", new BigDecimal("25.00"),
                new BigDecimal("18.50"), sku, "Marque", "50 ml", 4,
                true, true, sortOrder, "image-key.jpg", null);
    }
}
