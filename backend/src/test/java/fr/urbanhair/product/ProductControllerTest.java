package fr.urbanhair.product;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:product-controller-test;DB_CLOSE_DELAY=-1",
        "admin.username=test-admin",
        "admin.password=test-password-123"
})
class ProductControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private fr.urbanhair.storage.ImageUploadService images;

    @Autowired
    private ProductRepository products;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetCatalog() {
        jdbc.update("DELETE FROM products");
        jdbc.update("DELETE FROM product_catalog_migrations");
        products.seedLegacyCatalog();
    }

    @Test
    void publicCatalogContainsMigratedProductsAndAdminEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("Rituel nourrissant"));

        mockMvc.perform(get("/api/admin/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanCreateProductWithImageAndInvalidPromotionIsRejected() throws Exception {
        when(images.store(any())).thenReturn("product-image.jpg");
        MockMultipartFile image = new MockMultipartFile(
                "image", "serum.jpg", "image/jpeg", new byte[] { 1, 2, 3 });

        mockMvc.perform(multipart("/api/admin/products")
                        .file(image)
                        .param("name", "Sérum douceur")
                        .param("category", "Soin")
                        .param("description", "Soin des longueurs")
                        .param("price", "25.00")
                        .param("promotionPrice", "20.00")
                        .param("sku", "SERUM-01")
                        .param("brand", "Urban Hair")
                        .param("productFormat", "50 ml")
                        .param("stockQuantity", "4")
                        .param("published", "true")
                        .param("featured", "true")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Sérum douceur"))
                .andExpect(jsonPath("$.promotionPrice").value(20.0))
                .andExpect(jsonPath("$.stockQuantity").value(4))
                .andExpect(jsonPath("$.featured").value(true))
                .andExpect(jsonPath("$.imageUrl").value("/api/products/images/product-image.jpg"));

        mockMvc.perform(multipart("/api/admin/products")
                        .file(image)
                        .param("name", "Sérum invalide")
                        .param("category", "Soin")
                        .param("price", "25.00")
                        .param("promotionPrice", "25.00")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }
}
