package fr.urbanhair.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import org.springframework.web.multipart.MultipartFile;

public class ProductForm {
    @NotBlank
    @Size(max = 120)
    private String name;

    @NotBlank
    @Size(max = 80)
    private String category;

    @Size(max = 2000)
    private String description = "";

    @NotNull
    @DecimalMin("0.0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal price;

    @DecimalMin("0.0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal promotionPrice;

    @Size(max = 80)
    private String sku = "";

    @Size(max = 120)
    private String brand = "";

    @Size(max = 120)
    private String productFormat = "";

    @PositiveOrZero
    private Integer stockQuantity;

    private boolean published;
    private boolean featured;
    @Size(max = 1000)
    private String imageUrl = "";
    private MultipartFile image;

    public String getName() { return name; }
    public void setName(String name) { this.name = name == null ? null : name.trim(); }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category == null ? null : category.trim(); }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description == null ? "" : description.trim(); }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getPromotionPrice() { return promotionPrice; }
    public void setPromotionPrice(BigDecimal promotionPrice) { this.promotionPrice = promotionPrice; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku == null ? "" : sku.trim(); }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand == null ? "" : brand.trim(); }
    public String getProductFormat() { return productFormat; }
    public void setProductFormat(String productFormat) { this.productFormat = productFormat == null ? "" : productFormat.trim(); }
    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl == null ? "" : imageUrl.trim(); }
    public MultipartFile getImage() { return image; }
    public void setImage(MultipartFile image) { this.image = image; }
}
