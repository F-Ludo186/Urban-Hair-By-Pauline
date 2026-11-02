package fr.urbanhair.checkout;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OrderRepository {
    private final JdbcTemplate jdbc;

    public OrderRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void create(PendingOrder order) {
        jdbc.update("""
                INSERT INTO customer_orders
                    (id, status, customer_name, customer_email, customer_phone, fulfillment,
                     address_line1, postal_code, city, pickup_address, pickup_instructions,
                     subtotal, delivery_fee, total, idempotency_key)
                VALUES (?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                order.id(), order.customerName(), order.customerEmail(), order.customerPhone(),
                order.fulfillment(), order.addressLine1(), order.postalCode(), order.city(),
                order.pickupAddress(), order.pickupInstructions(),
                order.subtotal(), order.deliveryFee(), order.total(), order.idempotencyKey());
        for (OrderLine line : order.lines()) {
            jdbc.update("""
                    INSERT INTO order_lines (order_id, product_id, product_name, unit_price, quantity, tracks_stock)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, order.id(), line.productId(), line.productName(), line.unitPrice(),
                    line.quantity(), line.tracksStock());
        }
    }

    public Optional<OrderState> findByIdempotencyKey(String key) {
        return jdbc.query("""
                SELECT id, status, stripe_session_id FROM customer_orders WHERE idempotency_key = ?
                """, (row, index) -> new OrderState(
                row.getString("id"), row.getString("status"), row.getString("stripe_session_id")), key)
                .stream().findFirst();
    }

    public Optional<OrderState> findForUpdate(String id) {
        return jdbc.query("""
                SELECT id, status, stripe_session_id FROM customer_orders WHERE id = ? FOR UPDATE
                """, (row, index) -> new OrderState(
                row.getString("id"), row.getString("status"), row.getString("stripe_session_id")), id)
                .stream().findFirst();
    }

    public void setStripeSession(String orderId, String sessionId) {
        jdbc.update("UPDATE customer_orders SET stripe_session_id = ? WHERE id = ?", sessionId, orderId);
    }

    public List<OrderLine> findLines(String orderId) {
        return jdbc.query("""
                SELECT product_id, product_name, unit_price, quantity, tracks_stock
                FROM order_lines WHERE order_id = ? ORDER BY id
                """, (row, index) -> new OrderLine(
                row.getString("product_id"),
                row.getString("product_name"),
                row.getBigDecimal("unit_price"),
                row.getInt("quantity"),
                row.getBoolean("tracks_stock")), orderId);
    }

    public boolean markPaid(String orderId) {
        return jdbc.update("""
                UPDATE customer_orders
                SET status = 'PAID', paid_at = CURRENT_TIMESTAMP, notification_status = 'pending'
                WHERE id = ? AND status = 'PENDING'
                """, orderId) == 1;
    }

    public void markExpired(String orderId) {
        if (jdbc.update("""
                UPDATE customer_orders SET status = 'EXPIRED'
                WHERE id = ? AND status = 'PENDING'
                """, orderId) == 1) {
            for (OrderLine line : findLines(orderId)) {
                if (line.tracksStock()) {
                    jdbc.update("""
                            UPDATE products SET reserved_quantity = reserved_quantity - ?
                            WHERE id = ? AND reserved_quantity >= ?
                            """, line.quantity(), line.productId(), line.quantity());
                }
            }
        }
    }

    public List<NotificationOrder> claimPendingNotifications(int limit) {
        List<String> ids = jdbc.query("""
                SELECT id FROM customer_orders
                WHERE status = 'PAID' AND notification_status = 'pending'
                ORDER BY paid_at, id
                LIMIT ?
                """, (row, index) -> row.getString("id"), limit);
        return ids.stream()
                .filter(id -> jdbc.update("""
                        UPDATE customer_orders SET notification_status = 'sending'
                        WHERE id = ? AND status = 'PAID' AND notification_status = 'pending'
                        """, id) == 1)
                .map(this::loadNotificationOrder)
                .toList();
    }

    public void markNotificationSent(String orderId) {
        jdbc.update("""
                UPDATE customer_orders SET notification_status = 'sent', notification_error = NULL
                WHERE id = ? AND notification_status = 'sending'
                """, orderId);
    }

    public void markNotificationFailed(String orderId, String error) {
        jdbc.update("""
                UPDATE customer_orders
                SET notification_attempts = notification_attempts + 1,
                    notification_status = CASE WHEN notification_attempts >= 9 THEN 'failed' ELSE 'pending' END,
                    notification_error = ?
                WHERE id = ? AND notification_status = 'sending'
                """, error.substring(0, Math.min(error.length(), 500)), orderId);
    }

    public void resetInterruptedNotifications() {
        jdbc.update("UPDATE customer_orders SET notification_status = 'pending' WHERE notification_status = 'sending'");
    }

    private NotificationOrder loadNotificationOrder(String id) {
        return jdbc.queryForObject("""
                SELECT id, customer_name, customer_email, customer_phone, fulfillment,
                       address_line1, postal_code, city, pickup_address, pickup_instructions,
                       subtotal, delivery_fee, total
                FROM customer_orders WHERE id = ?
                """, (row, index) -> new NotificationOrder(
                row.getString("id"), row.getString("customer_name"), row.getString("customer_email"),
                row.getString("customer_phone"), row.getString("fulfillment"), row.getString("address_line1"),
                row.getString("postal_code"), row.getString("city"),
                row.getString("pickup_address"), row.getString("pickup_instructions"), row.getBigDecimal("subtotal"),
                row.getBigDecimal("delivery_fee"), row.getBigDecimal("total"), findLines(id)), id);
    }

    public record OrderLine(
            String productId,
            String productName,
            BigDecimal unitPrice,
            int quantity,
            boolean tracksStock) {}

    public record PendingOrder(
            String id,
            String idempotencyKey,
            String customerName,
            String customerEmail,
            String customerPhone,
            String fulfillment,
            String addressLine1,
            String postalCode,
            String city,
            String pickupAddress,
            String pickupInstructions,
            BigDecimal subtotal,
            BigDecimal deliveryFee,
            BigDecimal total,
            List<OrderLine> lines) {}

    public record OrderState(String id, String status, String stripeSessionId) {}

    public record NotificationOrder(
            String id,
            String customerName,
            String customerEmail,
            String customerPhone,
            String fulfillment,
            String addressLine1,
            String postalCode,
            String city,
            String pickupAddress,
            String pickupInstructions,
            BigDecimal subtotal,
            BigDecimal deliveryFee,
            BigDecimal total,
            List<OrderLine> lines) {}
}
