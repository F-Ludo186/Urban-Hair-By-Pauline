package fr.urbanhair.gallery;

public record GalleryRecord(
        String id,
        String title,
        String caption,
        String category,
        String imageKey,
        String instagramUrl,
        boolean published,
        int sortOrder,
        String groupId,
        String groupTitle) {}
