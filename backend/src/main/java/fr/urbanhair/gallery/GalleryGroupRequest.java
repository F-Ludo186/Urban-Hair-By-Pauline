package fr.urbanhair.gallery;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GalleryGroupRequest(@NotBlank @Size(max = 120) String title) {}
