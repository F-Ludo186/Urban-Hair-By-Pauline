package fr.urbanhair.gallery;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public class GalleryForm {
    @NotBlank
    @Size(max = 120)
    private String title;

    @Size(max = 2000)
    private String caption = "";

    @NotBlank
    @Size(max = 40)
    private String category;

    @Pattern(
            regexp = "^$|https://(www\\.)?instagram\\.com/(?:[A-Za-z0-9._]{1,30}/?|(?:p|reel)/[A-Za-z0-9_-]+/?)$",
            message = "Saisissez un lien de profil ou de publication Instagram.")
    private String instagramUrl = "";

    private boolean published;
    private MultipartFile image;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title == null ? null : title.trim(); }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption == null ? "" : caption.trim(); }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category == null ? null : category.trim(); }
    public String getInstagramUrl() { return instagramUrl; }
    public void setInstagramUrl(String instagramUrl) { this.instagramUrl = instagramUrl == null ? "" : instagramUrl.trim(); }
    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }
    public MultipartFile getImage() { return image; }
    public void setImage(MultipartFile image) { this.image = image; }
}
