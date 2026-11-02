package fr.urbanhair.checkout;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class StripeCheckoutClient {
    private final String secretKey;
    private final String frontendOrigin;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper json;

    public StripeCheckoutClient(
            @Value("${urbanhair.checkout.stripe-secret-key:}") String secretKey,
            @Value("${urbanhair.frontend-origin}") String frontendOrigin,
            ObjectMapper json) {
        this.secretKey = secretKey;
        this.frontendOrigin = frontendOrigin;
        this.json = json;
    }

    public StripeSession createSession(
            String orderId,
            String customerEmail,
            List<StripeLineItem> lines,
            String idempotencyKey) {
        List<String> fields = new ArrayList<>();
        fields.add(field("mode", "payment"));
        fields.add(field("payment_method_types[0]", "card"));
        fields.add(field("customer_email", customerEmail));
        fields.add(field("client_reference_id", orderId));
        fields.add(field("metadata[orderId]", orderId));
        fields.add(field("success_url", frontendOrigin + "/boutique?checkout=success"));
        fields.add(field("cancel_url", frontendOrigin + "/boutique?checkout=cancel"));
        fields.add(field("expires_at", Long.toString(Instant.now().plusSeconds(1860).getEpochSecond())));
        for (int index = 0; index < lines.size(); index++) {
            StripeLineItem line = lines.get(index);
            String prefix = "line_items[" + index + "]";
            fields.add(field(prefix + "[quantity]", Integer.toString(line.quantity())));
            fields.add(field(prefix + "[price_data][currency]", "eur"));
            fields.add(field(prefix + "[price_data][unit_amount]", Long.toString(line.unitAmountCents())));
            fields.add(field(prefix + "[price_data][product_data][name]", line.name()));
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.stripe.com/v1/checkout/sessions"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Idempotency-Key", idempotencyKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(String.join("&", fields)))
                .build();
        JsonNode response = send(request);
        String id = response.path("id").asText("");
        String url = response.path("url").asText("");
        if (id.isBlank() || url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe n’a pas créé la session de paiement.");
        }
        return new StripeSession(id, url);
    }

    public String findSessionUrl(String sessionId) {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("https://api.stripe.com/v1/checkout/sessions/" + encode(sessionId)))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .GET()
                .build();
        String url = send(request).path("url").asText("");
        if (url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette session de paiement n’est plus disponible.");
        }
        return url;
    }

    private JsonNode send(HttpRequest request) {
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode parsed = json.readTree(response.body());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY, "Le service de paiement refuse actuellement la demande.");
            }
            return parsed;
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Le service de paiement est momentanément injoignable.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "La création du paiement a été interrompue.", exception);
        }
    }

    private String field(String key, String value) {
        return encode(key) + "=" + encode(value);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record StripeSession(String id, String url) {}
    public record StripeLineItem(String name, long unitAmountCents, int quantity) {}
}
