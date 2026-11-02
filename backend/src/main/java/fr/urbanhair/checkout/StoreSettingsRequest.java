package fr.urbanhair.checkout;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record StoreSettingsRequest(
        @NotBlank @Email @Size(max = 254) String notificationEmail,
        @DecimalMin("0.0") @Digits(integer = 6, fraction = 2) BigDecimal deliveryFee,
        @NotBlank @Size(max = 120) String deliveryZone,
        @NotBlank @Size(max = 120)
        @Pattern(regexp = "\\d{2}(?:-\\d{2})?(?:\\s*,\\s*\\d{2}(?:-\\d{2})?)*")
        String deliveryPostalPrefixes,
        @NotBlank @Size(max = 500) String pickupAddress,
        @Size(max = 1000) String pickupInstructions) {}
