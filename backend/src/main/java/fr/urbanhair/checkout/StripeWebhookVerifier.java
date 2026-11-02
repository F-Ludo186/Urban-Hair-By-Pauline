package fr.urbanhair.checkout;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class StripeWebhookVerifier {
    private StripeWebhookVerifier() {}

    public static boolean isValid(String payload, String header, String secret, Instant now) {
        if (payload == null || header == null || secret == null || secret.isBlank()) return false;
        String timestamp = null;
        java.util.List<String> expectedSignatures = new java.util.ArrayList<>();
        for (String part : header.split(",")) {
            String[] pair = part.trim().split("=", 2);
            if (pair.length != 2) continue;
            if ("t".equals(pair[0])) timestamp = pair[1];
            if ("v1".equals(pair[0])) expectedSignatures.add(pair[1]);
        }
        if (timestamp == null || expectedSignatures.isEmpty()) return false;

        try {
            long signedAt = Long.parseLong(timestamp);
            if (signedAt < now.getEpochSecond() - 300 || signedAt > now.getEpochSecond() + 300) return false;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] calculated = toHex(mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8)))
                    .getBytes(StandardCharsets.US_ASCII);
            return expectedSignatures.stream().anyMatch(signature -> MessageDigest.isEqual(
                    calculated, signature.getBytes(StandardCharsets.US_ASCII)));
        } catch (IllegalArgumentException | java.security.GeneralSecurityException exception) {
            return false;
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) result.append(String.format("%02x", value & 0xff));
        return result.toString();
    }
}
