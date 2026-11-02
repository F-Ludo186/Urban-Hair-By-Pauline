package fr.urbanhair.checkout;

import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class StoreSettingsRepository {
    private final JdbcTemplate jdbc;

    public StoreSettingsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public StoreSettings get() {
        Optional<StoreSettings> existing = jdbc.query("""
                SELECT notification_email, delivery_fee, delivery_zone, delivery_postal_prefixes,
                       pickup_address, pickup_instructions
                FROM shop_settings WHERE singleton_id = 1
                """, (row, index) -> new StoreSettings(
                row.getString("notification_email"),
                row.getBigDecimal("delivery_fee"),
                row.getString("delivery_zone"),
                row.getString("delivery_postal_prefixes"),
                row.getString("pickup_address"),
                row.getString("pickup_instructions"))).stream().findFirst();
        if (existing.isPresent()) return existing.get();

        jdbc.update("""
                INSERT INTO shop_settings
                    (singleton_id, notification_email, delivery_zone, delivery_postal_prefixes,
                     pickup_address, pickup_instructions)
                VALUES (1, ?, ?, ?, ?, ?)
                """,
                "paulinefrt37@gmail.com",
                "France métropolitaine",
                "01-19,20,21-95",
                "53 ter rue Boucicault, 37800 Sainte-Catherine-de-Fierbois, France",
                "Retrait gratuit au salon.");
        return get();
    }

    public StoreSettings save(StoreSettingsRequest request) {
        if (!DeliveryPostcodes.isValid(request.deliveryPostalPrefixes())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Saisissez des préfixes de codes postaux valides (ex. 37, 41).");
        }
        get();
        jdbc.update("""
                UPDATE shop_settings
                SET notification_email = ?, delivery_fee = ?, delivery_zone = ?, delivery_postal_prefixes = ?,
                    pickup_address = ?, pickup_instructions = ?
                WHERE singleton_id = 1
                """,
                request.notificationEmail().trim(),
                request.deliveryFee(),
                request.deliveryZone().trim(),
                request.deliveryPostalPrefixes().replaceAll("\\s+", ""),
                request.pickupAddress().trim(),
                request.pickupInstructions() == null ? "" : request.pickupInstructions().trim());
        return get();
    }
}
