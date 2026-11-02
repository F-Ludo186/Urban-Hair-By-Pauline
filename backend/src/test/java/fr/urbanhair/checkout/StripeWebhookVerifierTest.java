package fr.urbanhair.checkout;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class StripeWebhookVerifierTest {
    private static final String SECRET = "whsec-test-secret";
    private static final String PAYLOAD = "{\"type\":\"checkout.session.completed\"}";

    @Test
    void acceptsValidSignatureAndRejectsTamperedOrStalePayload() throws Exception {
        Instant now = Instant.parse("2026-03-01T10:00:00Z");
        long timestamp = now.getEpochSecond();
        String signature = signature(PAYLOAD, timestamp);

        assertThat(StripeWebhookVerifier.isValid(PAYLOAD, "t=" + timestamp + ",v1=" + signature, SECRET, now)).isTrue();
        assertThat(StripeWebhookVerifier.isValid(
                PAYLOAD + " ", "t=" + timestamp + ",v1=" + signature, SECRET, now)).isFalse();
        assertThat(StripeWebhookVerifier.isValid(
                PAYLOAD, "t=" + (timestamp - 301) + ",v1=" + signature(PAYLOAD, timestamp - 301), SECRET, now)).isFalse();
    }

    @Test
    void acceptsOnlyConfiguredStripeTestKeysUnlessLivePaymentsAreExplicitlyEnabled() {
        assertThat(ShopSettingsController.validStripeConfiguration("sk_test_key", "whsec_key", false)).isTrue();
        assertThat(ShopSettingsController.validStripeConfiguration("sk_live_key", "whsec_key", false)).isFalse();
        assertThat(ShopSettingsController.validStripeConfiguration("sk_live_key", "whsec_key", true)).isTrue();
        assertThat(ShopSettingsController.validStripeConfiguration("sk_test_key", "", false)).isFalse();
    }

    @Test
    void deliveryPostcodeRangesAreValidatedAndApplied() {
        assertThat(DeliveryPostcodes.isValid("01-19,20,21-95")).isTrue();
        assertThat(DeliveryPostcodes.contains("37800", "37,41")).isTrue();
        assertThat(DeliveryPostcodes.contains("41000", "37,41")).isTrue();
        assertThat(DeliveryPostcodes.contains("75000", "37,41")).isFalse();
        assertThat(DeliveryPostcodes.isValid("95-01")).isFalse();
    }

    private String signature(String payload, long timestamp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(digest.length * 2);
        for (byte value : digest) hex.append("%02x".formatted(value & 0xff));
        return hex.toString();
    }
}
