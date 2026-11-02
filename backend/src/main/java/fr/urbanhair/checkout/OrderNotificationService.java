package fr.urbanhair.checkout;

import fr.urbanhair.checkout.OrderRepository.NotificationOrder;
import fr.urbanhair.checkout.OrderRepository.OrderLine;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class OrderNotificationService {
    private static final Logger LOGGER = LoggerFactory.getLogger(OrderNotificationService.class);
    private final OrderRepository orders;
    private final StoreSettingsRepository settings;
    private final ObjectProvider<JavaMailSender> mailSenders;
    private final String mailHost;
    private final String mailFrom;

    public OrderNotificationService(
            OrderRepository orders,
            StoreSettingsRepository settings,
            ObjectProvider<JavaMailSender> mailSenders,
            @Value("${urbanhair.checkout.mail-host:}") String mailHost,
            @Value("${urbanhair.checkout.mail-from:}") String mailFrom) {
        this.orders = orders;
        this.settings = settings;
        this.mailSenders = mailSenders;
        this.mailHost = mailHost;
        this.mailFrom = mailFrom;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void resetInterruptedNotifications() {
        orders.resetInterruptedNotifications();
    }

    @Scheduled(fixedDelayString = "${urbanhair.orders.notification-delay:60000}")
    public void sendPendingNotifications() {
        if (mailHost.isBlank() || mailFrom.isBlank()) return;
        JavaMailSender sender = mailSenders.getIfAvailable();
        if (sender == null) {
            LOGGER.error("Order notifications are pending but no mail sender is configured.");
            return;
        }
        for (NotificationOrder order : orders.claimPendingNotifications(20)) {
            try {
                sender.send(message(order));
                orders.markNotificationSent(order.id());
            } catch (MailException | IllegalStateException exception) {
                orders.markNotificationFailed(order.id(), exception.getClass().getSimpleName());
                LOGGER.warn("Order notification failed for order {}.", order.id(), exception);
            }
        }
    }

    private SimpleMailMessage message(NotificationOrder order) {
        StoreSettings current = settings.get();
        NumberFormat euros = NumberFormat.getCurrencyInstance(Locale.FRANCE);
        String lines = order.lines().stream()
                .map(this::formatLine)
                .collect(Collectors.joining("\n"));
        String destination = "PICKUP".equals(order.fulfillment())
                ? "Retrait au salon : " + order.pickupAddress() + " " + order.pickupInstructions()
                : "Livraison : " + order.addressLine1() + ", " + order.postalCode() + " " + order.city();
        String body = """
                Une nouvelle commande a été payée en ligne.

                Commande : %s
                Client : %s
                E-mail : %s
                Téléphone : %s

                Articles :
                %s

                Sous-total : %s
                Livraison : %s
                Total payé : %s
                Mode : %s
                """.formatted(
                order.id(),
                order.customerName(),
                order.customerEmail(),
                order.customerPhone(),
                lines,
                euros.format(order.subtotal()),
                euros.format(order.deliveryFee()),
                euros.format(order.total()),
                destination);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(current.notificationEmail());
        message.setSubject("Commande payée — Urban Hair #" + order.id());
        message.setText(body);
        return message;
    }

    private String formatLine(OrderLine line) {
        NumberFormat euros = NumberFormat.getCurrencyInstance(Locale.FRANCE);
        return "- %s × %d — %s".formatted(
                line.productName(), line.quantity(), euros.format(line.unitPrice().multiply(
                        java.math.BigDecimal.valueOf(line.quantity()))));
    }
}
