package fr.urbanhair.checkout;

import java.math.BigDecimal;

public record StoreSettings(
        String notificationEmail,
        BigDecimal deliveryFee,
        String deliveryZone,
        String deliveryPostalPrefixes,
        String pickupAddress,
        String pickupInstructions) {}
