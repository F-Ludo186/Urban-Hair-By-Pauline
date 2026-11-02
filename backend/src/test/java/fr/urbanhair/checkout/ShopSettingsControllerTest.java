package fr.urbanhair.checkout;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:shop-settings-controller-test;DB_CLOSE_DELAY=-1",
        "admin.username=test-admin",
        "admin.password=test-password-123"
})
class ShopSettingsControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetSettings() {
        jdbc.update("DELETE FROM shop_settings");
    }

    @Test
    void deliveryIsUnavailableUntilTheSalonSetsAFlatRate() throws Exception {
        mockMvc.perform(get("/api/shop/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkoutAvailable").value(false))
                .andExpect(jsonPath("$.deliveryAvailable").value(false))
                .andExpect(jsonPath("$.pickupAddress").value(
                        "53 ter rue Boucicault, 37800 Sainte-Catherine-de-Fierbois, France"));
    }

    @Test
    void adminCanEditRecipientAndDeliverySettings() throws Exception {
        mockMvc.perform(put("/api/admin/shop-settings")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "notificationEmail": "commandes@example.test",
                                  "deliveryFee": 5.50,
                                  "deliveryZone": "France métropolitaine",
                                  "deliveryPostalPrefixes": "01-19,20,21-95",
                                  "pickupAddress": "53 ter rue Boucicault, Sainte-Catherine-de-Fierbois, 37800",
                                  "pickupInstructions": "Retrait gratuit au salon."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settings.notificationEmail").value("commandes@example.test"))
                .andExpect(jsonPath("$.settings.deliveryFee").value(5.5))
                .andExpect(jsonPath("$.paymentConfigured").value(false))
                .andExpect(jsonPath("$.mailConfigured").value(false));

        mockMvc.perform(get("/api/shop/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkoutAvailable").value(false))
                .andExpect(jsonPath("$.deliveryAvailable").value(true))
                .andExpect(jsonPath("$.deliveryFee").value(5.5));
    }

    @Test
    void checkoutCannotStartUntilStripeAndMailAreConfigured() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/orders/checkout")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idempotencyKey": "checkout-test-key-0002",
                                  "items": [{"productId": "product-1", "quantity": 1}],
                                  "customerName": "Camille Martin",
                                  "customerEmail": "camille@example.test",
                                  "customerPhone": "0612345678",
                                  "fulfillment": "PICKUP"
                                }
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(
                        "Le paiement en ligne n’est pas encore configuré. Contactez le salon pour commander."));
    }
}
