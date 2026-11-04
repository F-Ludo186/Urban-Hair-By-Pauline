package fr.urbanhair.home;

public record HomeSection(
        String id,
        String eyebrow,
        String title,
        String body,
        String linkLabel,
        String linkUrl,
        String signature,
        String layout,
        int sortOrder,
        String imageUrl) {
}
