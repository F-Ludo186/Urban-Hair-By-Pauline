package fr.urbanhair.checkout;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import fr.urbanhair.product.ProductRecord;
import fr.urbanhair.product.ProductRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.mockito.ArgumentCaptor;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:checkout-flow-test;DB_CLOSE_DELAY=-1",
        "admin.username=test-admin",
        "admin.password=test-password-123",
        "urbanhair.checkout.stripe-secret-key=sk_test_configured",
        "urbanhair.checkout.stripe-webhook-secret=whsec_checkout_test",
        "urbanhair.checkout.mail-host=localhost",
        "urbanhair.checkout.mail-from=orders@example.test"
})
class CheckoutFlowTest {
    private static final String WEBHOOK_SECRET = "whsec_checkout_test";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ProductRepository products;

    @Autowired
    private StoreSettingsRepository settings;

    @Autowired
    private OrderNotificationService notifications;

    @MockBean
    private StripeCheckoutClient stripe;

    @MockBean
    private JavaMailSender mailSender;

    @BeforeEach
    void resetCheckoutState() {
        jdbc.update("DELETE FROM order_lines");
        jdbc.update("DELETE FROM customer_orders");
        jdbc.update("DELETE FROM products");
        jdbc.update("DELETE FROM product_catalog_migrations");
        products.seedLegacyCatalog();
        products.insert(new ProductRecord(
                "checkout-product", "Sérum", "Soin", "Soin des longueurs",
                new BigDecimal("25.00"), new BigDecimal("20.00"), "SERUM-CHECKOUT",
                "Urban Hair", "50 ml", 4, true, false, 0, null,
                "https://example.test/serum.jpg"));
        settings.save(new StoreSettingsRequest(
                "orders@example.test",
                new BigDecimal("5.50"),
                "France métropolitaine",
                "01-19,20,21-95",
                "53 ter rue Boucicault, 37800 Sainte-Catherine-de-Fierbois, France",
                "Retrait gratuit au salon."));
    }

    @Test
    void serverCalculatesPricesReservesStockAndOnlyDecrementsAfterVerifiedPayment() throws Exception {
        when(stripe.createSession(anyString(), anyString(), anyList(), anyString()))
                .thenReturn(new StripeCheckoutClient.StripeSession("cs_test_checkout", "https://checkout.stripe.test/session"));
        String checkoutRequest = """
                {
                  "idempotencyKey": "checkout-test-key-0001",
                  "items": [{"productId": "checkout-product", "quantity": 2}],
                  "customerName": "Camille Martin",
                  "customerEmail": "camille@example.test",
                  "customerPhone": "0612345678",
                  "fulfillment": "DELIVERY",
                  "addressLine1": "1 rue de Test",
                  "postalCode": "37800",
                  "city": "Sainte-Catherine-de-Fierbois"
                }
                """;

        mockMvc.perform(post("/api/orders/checkout")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkoutRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkoutUrl").value("https://checkout.stripe.test/session"));

        String orderId = jdbc.queryForObject("SELECT id FROM customer_orders", String.class);
        assertThat(jdbc.queryForObject(
                "SELECT total FROM customer_orders WHERE id = ?", BigDecimal.class, orderId))
                .isEqualByComparingTo("45.50");
        assertThat(products.findById("checkout-product").orElseThrow().stockQuantity())
                .isEqualTo(4);
        assertThat(products.reservedQuantity("checkout-product")).isEqualTo(2);
        org.mockito.Mockito.verifyNoInteractions(mailSender);

        String event = """
                {"type":"checkout.session.completed","data":{"object":{
                  "id":"cs_test_checkout","payment_status":"paid",
                  "metadata":{"orderId":"%s"}
                }}}
                """.formatted(orderId);
        long timestamp = Instant.now().getEpochSecond();
        String signature = signature(event, timestamp);

        mockMvc.perform(post("/api/orders/stripe-webhook")
                        .header("Stripe-Signature", "t=" + timestamp + ",v1=" + signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(event))
                .andExpect(status().isOk());

        assertThat(products.findById("checkout-product").orElseThrow().stockQuantity())
                .isEqualTo(2);
        assertThat(products.reservedQuantity("checkout-product")).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT status FROM customer_orders WHERE id = ?", String.class, orderId))
                .isEqualTo("PAID");

        notifications.sendPendingNotifications();
        ArgumentCaptor<SimpleMailMessage> email = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(email.capture());
        assertThat(email.getValue().getTo()).containsExactly("orders@example.test");
        assertThat(email.getValue().getText()).contains("1 rue de Test", "Total payé");
        assertThat(jdbc.queryForObject(
                "SELECT notification_status FROM customer_orders WHERE id = ?", String.class, orderId))
                .isEqualTo("sent");

        mockMvc.perform(post("/api/orders/stripe-webhook")
                        .header("Stripe-Signature", "t=" + timestamp + ",v1=" + signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(event))
                .andExpect(status().isOk());
        assertThat(products.findById("checkout-product").orElseThrow().stockQuantity())
                .isEqualTo(2);
    }

    private String signature(String payload, long timestamp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(digest.length * 2);
        for (byte value : digest) hex.append("%02x".formatted(value & 0xff));
        return hex.toString();
    }
}
