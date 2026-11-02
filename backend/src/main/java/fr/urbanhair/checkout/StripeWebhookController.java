package fr.urbanhair.checkout;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/orders")
public class StripeWebhookController {
    private final CheckoutService checkout;
    private final ObjectMapper json;
    private final String webhookSecret;

    public StripeWebhookController(
            CheckoutService checkout,
            ObjectMapper json,
            @Value("${urbanhair.checkout.stripe-webhook-secret:}") String webhookSecret) {
        this.checkout = checkout;
        this.json = json;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping("/stripe-webhook")
    public ResponseEntity<Void> receive(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        if (!StripeWebhookVerifier.isValid(payload, signature, webhookSecret, Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature Stripe invalide.");
        }
        try {
            JsonNode event = json.readTree(payload);
            String type = event.path("type").asText("");
            JsonNode session = event.path("data").path("object");
            String sessionId = session.path("id").asText("");
            String orderId = session.path("metadata").path("orderId").asText("");
            if ("checkout.session.completed".equals(type)
                    && "paid".equals(session.path("payment_status").asText())
                    && !orderId.isBlank() && !sessionId.isBlank()) {
                checkout.completeOrder(orderId, sessionId);
            } else if ("checkout.session.expired".equals(type)
                    && !orderId.isBlank() && !sessionId.isBlank()) {
                checkout.expireOrder(orderId, sessionId);
            }
            return ResponseEntity.ok().build();
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Événement Stripe illisible.", exception);
        }
    }
}
