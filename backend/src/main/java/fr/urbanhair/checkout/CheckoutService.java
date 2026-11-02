package fr.urbanhair.checkout;

import fr.urbanhair.checkout.CheckoutRequest.Fulfillment;
import fr.urbanhair.checkout.OrderRepository.OrderLine;
import fr.urbanhair.checkout.OrderRepository.OrderState;
import fr.urbanhair.product.ProductRecord;
import fr.urbanhair.product.ProductRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CheckoutService {
    private final ProductRepository products;
    private final OrderRepository orders;
    private final StoreSettingsRepository settings;
    private final StripeCheckoutClient stripe;
    private final boolean paymentConfigured;
    private final boolean mailConfigured;

    public CheckoutService(
            ProductRepository products,
            OrderRepository orders,
            StoreSettingsRepository settings,
            StripeCheckoutClient stripe,
            @Value("${urbanhair.checkout.stripe-secret-key:}") String stripeSecret,
            @Value("${urbanhair.checkout.stripe-webhook-secret:}") String webhookSecret,
            @Value("${urbanhair.checkout.live-payments-enabled:false}") boolean livePaymentsEnabled,
            @Value("${urbanhair.checkout.mail-host:}") String mailHost,
            @Value("${urbanhair.checkout.mail-from:}") String mailFrom) {
        this.products = products;
        this.orders = orders;
        this.settings = settings;
        this.stripe = stripe;
        this.paymentConfigured = ShopSettingsController.validStripeConfiguration(
                stripeSecret, webhookSecret, livePaymentsEnabled);
        this.mailConfigured = !mailHost.isBlank() && !mailFrom.isBlank();
    }

    @Transactional
    public CheckoutSessionResponse createSession(CheckoutRequest request) {
        if (!paymentConfigured || !mailConfigured) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le paiement en ligne n’est pas encore configuré. Contactez le salon pour commander.");
        }

        OrderState existing = orders.findByIdempotencyKey(request.idempotencyKey()).orElse(null);
        if (existing != null) {
            if ("PENDING".equals(existing.status()) && existing.stripeSessionId() != null) {
                return new CheckoutSessionResponse(stripe.findSessionUrl(existing.stripeSessionId()));
            }
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Cette demande de paiement a déjà été utilisée. Actualisez votre panier.");
        }

        StoreSettings currentSettings = settings.get();
        BigDecimal deliveryFee = BigDecimal.ZERO.setScale(2);
        if (request.fulfillment() == Fulfillment.DELIVERY) {
            deliveryFee = currentSettings.deliveryFee();
            if (deliveryFee == null || currentSettings.deliveryZone().isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE, "La livraison n’est pas encore configurée par le salon.");
            }
            validateDeliveryAddress(request, currentSettings.deliveryPostalPrefixes());
        }
        validateCustomer(request);

        if (new HashSet<>(request.items().stream().map(CheckoutRequest.Item::productId).toList()).size()
                != request.items().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le panier contient des lignes en double.");
        }

        String orderId = UUID.randomUUID().toString();
        List<OrderLine> lines = new ArrayList<>();
        List<StripeCheckoutClient.StripeLineItem> stripeLines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO.setScale(2);
        int totalQuantity = 0;
        for (CheckoutRequest.Item item : request.items()) {
            totalQuantity += item.quantity();
            if (totalQuantity > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La quantité totale dépasse la limite autorisée.");
            }

            ProductRecord product = products.findByIdForUpdate(item.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Un produit du panier n’est plus disponible."));
            if (!product.published() || (product.stockQuantity() != null && product.stockQuantity() == 0)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Un produit du panier n’est plus disponible.");
            }

            BigDecimal price = (product.promotionPrice() == null ? product.price() : product.promotionPrice())
                    .setScale(2, RoundingMode.UNNECESSARY);
            boolean tracksStock = product.stockQuantity() != null;
            if (tracksStock && !products.reserveStock(product.id(), item.quantity())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Le stock d’un produit vient de changer. Actualisez votre panier.");
            }
            subtotal = subtotal.add(price.multiply(BigDecimal.valueOf(item.quantity())));
            lines.add(new OrderLine(product.id(), product.name(), price, item.quantity(), tracksStock));
            stripeLines.add(new StripeCheckoutClient.StripeLineItem(
                    product.name(), price.movePointRight(2).longValueExact(), item.quantity()));
        }

        if (deliveryFee.signum() > 0) {
            stripeLines.add(new StripeCheckoutClient.StripeLineItem(
                    "Livraison — " + currentSettings.deliveryZone(),
                    deliveryFee.movePointRight(2).longValueExact(),
                    1));
        }

        BigDecimal total = subtotal.add(deliveryFee).setScale(2, RoundingMode.UNNECESSARY);
        long totalCents = total.movePointRight(2).longValueExact();
        if (totalCents < 50 || totalCents > 99_999_999) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Le montant total doit être compris entre 0,50 € et 999 999,99 €.");
        }
        String addressLine1 = request.fulfillment() == Fulfillment.DELIVERY ? request.addressLine1().trim() : null;
        String postalCode = request.fulfillment() == Fulfillment.DELIVERY ? request.postalCode().trim() : null;
        String city = request.fulfillment() == Fulfillment.DELIVERY ? request.city().trim() : null;
        OrderRepository.PendingOrder order = new OrderRepository.PendingOrder(
                orderId,
                request.idempotencyKey(),
                request.customerName().trim(),
                request.customerEmail().trim(),
                request.customerPhone().trim(),
                request.fulfillment().name(),
                addressLine1,
                postalCode,
                city,
                request.fulfillment() == Fulfillment.PICKUP ? currentSettings.pickupAddress() : null,
                request.fulfillment() == Fulfillment.PICKUP ? currentSettings.pickupInstructions() : null,
                subtotal,
                deliveryFee,
                total,
                lines);
        orders.create(order);

        StripeCheckoutClient.StripeSession session = stripe.createSession(
                orderId, request.customerEmail().trim(), stripeLines, request.idempotencyKey());
        orders.setStripeSession(orderId, session.id());
        return new CheckoutSessionResponse(session.url());
    }

    @Transactional
    public void completeOrder(String orderId, String sessionId) {
        OrderState order = orders.findForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commande introuvable."));
        if (order.stripeSessionId() == null || !order.stripeSessionId().equals(sessionId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La session de paiement ne correspond pas à la commande.");
        }
        if ("PAID".equals(order.status())) return;
        if (!"PENDING".equals(order.status())) return;

        for (OrderLine line : orders.findLines(orderId)) {
            if (line.tracksStock() && !products.commitReservedStock(line.productId(), line.quantity())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Le stock réservé ne peut pas être validé pour cette commande.");
            }
        }
        orders.markPaid(orderId);
    }

    @Transactional
    public void expireOrder(String orderId, String sessionId) {
        OrderState order = orders.findForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commande introuvable."));
        if (order.stripeSessionId() != null && order.stripeSessionId().equals(sessionId)) {
            orders.markExpired(orderId);
        }
    }

    private void validateCustomer(CheckoutRequest request) {
        String phoneDigits = request.customerPhone().replaceAll("\\D", "");
        if (phoneDigits.length() < 8 || phoneDigits.length() > 15) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Saisissez un numéro de téléphone valide.");
        }
    }

    private void validateDeliveryAddress(CheckoutRequest request, String postalPrefixes) {
        if (request.addressLine1() == null || request.addressLine1().isBlank()
                || request.postalCode() == null || request.city() == null || request.city().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complétez l’adresse de livraison.");
        }
        if (!DeliveryPostcodes.contains(request.postalCode().trim(), postalPrefixes)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Cette adresse est en dehors de la zone de livraison configurée.");
        }
    }
}
