package fr.urbanhair.product;

import fr.urbanhair.storage.ImageNotFoundException;
import fr.urbanhair.storage.ImageUploadService;
import jakarta.validation.Valid;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ProductController {
    private final ProductRepository repository;
    private final ImageUploadService images;

    public ProductController(ProductRepository repository, ImageUploadService images) {
        this.repository = repository;
        this.images = images;
    }

    @GetMapping("/products")
    public List<Product> getProducts() {
        return repository.findPublished().stream().map(this::toProduct).toList();
    }

    @GetMapping("/products/images/{key:.+}")
    public ResponseEntity<byte[]> getImage(@PathVariable("key") String key) {
        try {
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .cacheControl(CacheControl.noCache())
                    .header("X-Content-Type-Options", "nosniff")
                    .body(images.load(key));
        } catch (ImageNotFoundException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/admin/products")
    public List<Product> getAdminProducts() {
        return repository.findAll().stream().map(this::toProduct).toList();
    }

    @PostMapping(value = "/admin/products", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Product> create(@Valid @ModelAttribute ProductForm form, BindingResult validation) {
        validate(form, validation, true);
        String sku = normalizedSku(form.getSku());
        ensureSkuAvailable(sku, null);
        String imageKey = storeImage(form);
        ProductRecord record = toRecord(UUID.randomUUID().toString(), form, sku, imageKey, null, 0);
        try {
            repository.insert(record);
        } catch (RuntimeException exception) {
            images.delete(imageKey);
            throw exception;
        }
        Product created = findById(record.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping(value = "/admin/products/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Product update(
            @PathVariable("id") String id,
            @Valid @ModelAttribute ProductForm form,
            BindingResult validation) {
        validate(form, validation, false);
        ProductRecord current = findRecord(id);
        if (!repository.canSetStock(id, form.getStockQuantity())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Le stock ne peut pas être inférieur aux quantités réservées pour des commandes en cours.");
        }
        String sku = normalizedSku(form.getSku());
        ensureSkuAvailable(sku, id);
        boolean replaceImage = form.getImage() != null && !form.getImage().isEmpty();
        String imageKey = replaceImage ? storeImage(form) : current.imageKey();
        String imageUrl = replaceImage ? null : current.imageUrl();
        ProductRecord updated = toRecord(id, form, sku, imageKey, imageUrl, current.sortOrder());
        int updatedRows;
        try {
            updatedRows = repository.update(updated);
        } catch (RuntimeException exception) {
            if (replaceImage) images.delete(imageKey);
            throw exception;
        }
        if (updatedRows != 1) {
            if (replaceImage) images.delete(imageKey);
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Le stock ne peut pas être inférieur aux quantités réservées pour des commandes en cours.");
        }
        if (replaceImage && current.imageKey() != null) images.delete(current.imageKey());
        return findById(id);
    }

    @DeleteMapping("/admin/products/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") String id) {
        ProductRecord product = findRecord(id);
        if (repository.hasReservations(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Ce produit est réservé pour une commande en cours et ne peut pas être supprimé.");
        }
        if (repository.delete(id) != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Ce produit est réservé pour une commande en cours et ne peut pas être supprimé.");
        }
        if (product.imageKey() != null) images.delete(product.imageKey());
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/admin/products/order", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> reorder(@RequestBody ProductOrder order) {
        if (order == null || order.ids() == null
                || new HashSet<>(order.ids()).size() != order.ids().size()
                || !repository.containsAllIds(order.ids())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L’ordre transmis ne correspond pas au catalogue.");
        }
        repository.reorder(order.ids());
        return ResponseEntity.noContent().build();
    }

    private void validate(ProductForm form, BindingResult result, boolean creating) {
        if (result.hasErrors()) {
            String message = result.getFieldErrors().stream()
                    .map(error -> error.getField() + " : " + error.getDefaultMessage())
                    .findFirst()
                    .orElse("Les informations saisies sont invalides.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        if (form.getPromotionPrice() != null && form.getPromotionPrice().compareTo(form.getPrice()) >= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le prix promotionnel doit être inférieur au prix de vente.");
        }
        if (creating && (form.getImage() == null || form.getImage().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ajoutez une photo au produit.");
        }
    }

    private void ensureSkuAvailable(String sku, String id) {
        if (sku != null && repository.skuExists(sku, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette référence produit est déjà utilisée.");
        }
    }

    private String storeImage(ProductForm form) {
        try {
            return images.store(form.getImage());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

    private Product findById(String id) {
        return repository.findById(id).map(this::toProduct)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produit introuvable."));
    }

    private ProductRecord findRecord(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produit introuvable."));
    }

    private ProductRecord toRecord(
            String id, ProductForm form, String sku, String imageKey, String imageUrl, int sortOrder) {
        return new ProductRecord(
                id, form.getName(), form.getCategory(), form.getDescription(), form.getPrice(),
                form.getPromotionPrice(), sku, emptyToNull(form.getBrand()),
                emptyToNull(form.getProductFormat()), form.getStockQuantity(), form.isPublished(),
                form.isFeatured(), sortOrder, imageKey, imageUrl);
    }

    private Product toProduct(ProductRecord record) {
        String imageUrl = record.imageKey() == null
                ? record.imageUrl()
                : "/api/products/images/" + record.imageKey();
        return new Product(
                record.id(), record.name(), record.category(), record.description(), record.price(),
                record.promotionPrice(), record.sku(), record.brand(), record.productFormat(),
                record.stockQuantity(), record.published(), record.featured(), record.sortOrder(), imageUrl);
    }

    private String normalizedSku(String sku) {
        return sku == null || sku.isBlank() ? null : sku.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
