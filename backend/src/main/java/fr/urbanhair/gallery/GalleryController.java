package fr.urbanhair.gallery;

import fr.urbanhair.storage.ImageNotFoundException;
import fr.urbanhair.storage.ImageUploadService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class GalleryController {
    private final GalleryRepository repository;
    private final ImageUploadService images;

    public GalleryController(GalleryRepository repository, ImageUploadService images) {
        this.repository = repository;
        this.images = images;
    }

    @GetMapping("/api/gallery")
    public List<GalleryItem> getPublicGallery() {
        return repository.findPublished().stream().map(this::toItem).toList();
    }

    @GetMapping("/api/gallery/images/{key:.+}")
    public ResponseEntity<byte[]> getImage(@PathVariable String key) {
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

    @GetMapping("/api/admin/gallery")
    public List<GalleryItem> getAdminGallery() {
        return repository.findAll().stream().map(this::toItem).toList();
    }

    @PostMapping(value = "/api/admin/gallery", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GalleryItem> create(@Valid @ModelAttribute GalleryForm form, BindingResult validation) {
        validate(validation);
        String key = storeImage(form);
        GalleryRecord item = new GalleryRecord(
                UUID.randomUUID().toString(), form.getTitle(), form.getCaption(), form.getCategory(),
                key, emptyToNull(form.getInstagramUrl()), form.isPublished());
        try {
            repository.insert(item);
        } catch (RuntimeException exception) {
            images.delete(key);
            throw exception;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(toItem(item));
    }

    @PutMapping(value = "/api/admin/gallery/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public GalleryItem update(
            @PathVariable String id,
            @Valid @ModelAttribute GalleryForm form,
            BindingResult validation) {
        validate(validation);
        GalleryRecord current = findById(id);
        String key = current.imageKey();
        boolean replacedImage = form.getImage() != null && !form.getImage().isEmpty();
        if (replacedImage) {
            key = storeImage(form);
        }
        GalleryRecord updated = new GalleryRecord(
                current.id(), form.getTitle(), form.getCaption(), form.getCategory(),
                key, emptyToNull(form.getInstagramUrl()), form.isPublished());
        try {
            repository.update(updated);
        } catch (RuntimeException exception) {
            if (replacedImage) {
                images.delete(key);
            }
            throw exception;
        }
        if (replacedImage) {
            images.delete(current.imageKey());
        }
        return toItem(updated);
    }

    @DeleteMapping("/api/admin/gallery/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        GalleryRecord item = findById(id);
        repository.delete(id);
        images.delete(item.imageKey());
        return ResponseEntity.noContent().build();
    }

    private void validate(BindingResult result) {
        if (result.hasErrors()) {
            String message = result.getFieldErrors().stream()
                    .map(error -> error.getField() + " : " + error.getDefaultMessage())
                    .findFirst()
                    .orElse("Les informations saisies sont invalides.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private GalleryRecord findById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Réalisation introuvable."));
    }

    private GalleryItem toItem(GalleryRecord record) {
        return new GalleryItem(
                record.id(), record.title(), record.caption(), record.category(),
                "/api/gallery/images/" + record.imageKey(), record.instagramUrl(), record.published());
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String storeImage(GalleryForm form) {
        try {
            return images.store(form.getImage());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }
}
