package fr.urbanhair.gallery;

public record GalleryItem(
        String id,
        String title,
        String caption,
        String category,
        String imageUrl,
        String instagramUrl,
        boolean published,
        String groupId,
        String groupTitle) {}
