package fr.urbanhair.home;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public class HomeSectionForm {
    @Size(max = 120)
    private String eyebrow = "";

    @Size(max = 240)
    private String title = "";

    @Size(max = 2000)
    private String body = "";

    @Size(max = 120)
    private String linkLabel = "";

    @Size(max = 500)
    @Pattern(
            regexp = "^$|/(?!/)[^\\s]*|mailto:[^\\s]+",
            message = "Utilisez un chemin interne (ex. /galerie) ou une adresse mailto.")
    private String linkUrl = "";

    @Size(max = 120)
    private String signature = "";

    @NotBlank
    @Size(max = 40)
    private String layout;

    private boolean removeImage;
    private MultipartFile image;

    public String getEyebrow() { return eyebrow; }
    public void setEyebrow(String eyebrow) { this.eyebrow = trim(eyebrow); }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title == null ? null : title.trim(); }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = trim(body); }
    public String getLinkLabel() { return linkLabel; }
    public void setLinkLabel(String linkLabel) { this.linkLabel = trim(linkLabel); }
    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = trim(linkUrl); }
    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = trim(signature); }
    public String getLayout() { return layout; }
    public void setLayout(String layout) { this.layout = layout == null ? null : layout.trim(); }
    public boolean isRemoveImage() { return removeImage; }
    public void setRemoveImage(boolean removeImage) { this.removeImage = removeImage; }
    public MultipartFile getImage() { return image; }
    public void setImage(MultipartFile image) { this.image = image; }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
