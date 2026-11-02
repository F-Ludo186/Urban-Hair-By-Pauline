package fr.urbanhair.checkout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CheckoutRequest(
        @NotBlank @Size(min = 16, max = 80) @Pattern(regexp = "[A-Za-z0-9._:-]+") String idempotencyKey,
        @NotEmpty @Size(max = 20) List<@Valid Item> items,
        @NotBlank @Size(max = 160) String customerName,
        @NotBlank @Email @Size(max = 254) String customerEmail,
        @NotBlank @Size(max = 40) String customerPhone,
        @NotNull Fulfillment fulfillment,
        @Size(max = 200) String addressLine1,
        @Size(max = 20) String postalCode,
        @Size(max = 120) String city) {

    public record Item(
            @NotBlank @Size(max = 80) String productId,
            @NotNull @Positive @Max(100) Integer quantity) {}

    public enum Fulfillment {
        DELIVERY,
        PICKUP
    }
}
