package fr.urbanhair.checkout;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ShopSettingsController {
    private final StoreSettingsRepository settings;
    private final boolean paymentConfigured;
    private final boolean mailConfigured;

    public ShopSettingsController(
            StoreSettingsRepository settings,
            @Value("${urbanhair.checkout.stripe-secret-key:}") String stripeSecret,
            @Value("${urbanhair.checkout.stripe-webhook-secret:}") String webhookSecret,
            @Value("${urbanhair.checkout.live-payments-enabled:false}") boolean livePaymentsEnabled,
            @Value("${urbanhair.checkout.mail-host:}") String mailHost,
            @Value("${urbanhair.checkout.mail-from:}") String mailFrom) {
        this.settings = settings;
        this.paymentConfigured = validStripeConfiguration(stripeSecret, webhookSecret, livePaymentsEnabled);
        this.mailConfigured = !mailHost.isBlank() && !mailFrom.isBlank();
    }

    @GetMapping("/shop/settings")
    public CheckoutOptions getPublicSettings() {
        StoreSettings current = settings.get();
        return new CheckoutOptions(
                paymentConfigured && mailConfigured,
                current.deliveryFee() != null && !current.deliveryZone().isBlank()
                        && DeliveryPostcodes.isValid(current.deliveryPostalPrefixes()),
                current.deliveryFee(),
                current.deliveryZone(),
                current.pickupAddress(),
                current.pickupInstructions());
    }

    @GetMapping("/admin/shop-settings")
    public AdminShopSettings getAdminSettings() {
        return new AdminShopSettings(settings.get(), paymentConfigured, mailConfigured);
    }

    @PutMapping("/admin/shop-settings")
    public AdminShopSettings updateSettings(@Valid @RequestBody StoreSettingsRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Les paramètres de la boutique sont requis.");
        }
        return new AdminShopSettings(settings.save(request), paymentConfigured, mailConfigured);
    }

    public record CheckoutOptions(
            boolean checkoutAvailable,
            boolean deliveryAvailable,
            BigDecimal deliveryFee,
            String deliveryZone,
            String pickupAddress,
            String pickupInstructions) {}

    public record AdminShopSettings(StoreSettings settings, boolean paymentConfigured, boolean mailConfigured) {}

    static boolean validStripeConfiguration(String secret, String webhook, boolean livePaymentsEnabled) {
        return !secret.isBlank() && !webhook.isBlank()
                && (livePaymentsEnabled || secret.startsWith("sk_test_"));
    }
}
