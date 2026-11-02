package fr.urbanhair.product;

import java.math.BigDecimal;

public record Product(
        String id,
        String name,
        String category,
        String description,
        BigDecimal price,
        BigDecimal promotionPrice,
        String sku,
        String brand,
        String productFormat,
        Integer stockQuantity,
        boolean published,
        boolean featured,
        int sortOrder,
        String imageUrl) {}
