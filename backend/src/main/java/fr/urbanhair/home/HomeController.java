package fr.urbanhair.home;

import fr.urbanhair.storage.ImageNotFoundException;
import fr.urbanhair.storage.ImageUploadService;
import jakarta.validation.Valid;
import java.util.HashSet;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class HomeController {
    private static final List<String> SECTION_IDS = List.of("hero", "intro", "feature", "quote");

    private final HomeSectionRepository repository;
    private final ImageUploadService images;

    public HomeController(HomeSectionRepository repository, ImageUploadService images) {
        this.repository = repository;
        this.images = images;
    }

    @GetMapping("/api/home")
    public List<HomeSection> getPublicSections() {
        return repository.findAll().stream().map(this::toSection).toList();
    }

    @GetMapping("/api/admin/home")
    public List<HomeSection> getAdminSections() {
        return getPublicSections();
    }

    @GetMapping("/api/home/images/{key:.+}")
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

    @PutMapping(value = "/api/admin/home/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public HomeSection update(
            @PathVariable("id") String id,
            @Valid @ModelAttribute HomeSectionForm form,
            BindingResult validation) {
        validate(validation);
        if (!SECTION_IDS.contains(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section d’accueil introuvable.");
        }
        if (!"quote".equals(id) && (form.getTitle() == null || form.getTitle().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le titre de cette section est obligatoire.");
        }
        HomeSectionRecord current = findById(id);
        if (!allowedLayouts(id).contains(form.getLayout())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cette disposition n’est pas disponible pour la section.");
        }
        if (form.isRemoveImage() && form.getImage() != null && !form.getImage().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez une nouvelle image ou supprimez l’image actuelle, pas les deux.");
        }

        String imageKey = current.imageKey();
        String imageUrl = current.imageUrl();
        boolean replacedImage = form.getImage() != null && !form.getImage().isEmpty();
        if (replacedImage) {
            imageKey = storeImage(form);
            imageUrl = null;
        } else if (form.isRemoveImage()) {
            imageKey = null;
            imageUrl = null;
        }

        HomeSectionRecord updated = new HomeSectionRecord(
                current.id(), form.getEyebrow(), form.getTitle() == null ? "" : form.getTitle(), form.getBody(), form.getLinkLabel(),
                form.getLinkUrl(), form.getSignature(), form.getLayout(), current.sortOrder(),
                imageKey, imageUrl);
        try {
            if (repository.update(updated) != 1) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section d’accueil introuvable.");
            }
        } catch (RuntimeException exception) {
            if (replacedImage) images.delete(imageKey);
            throw exception;
        }
        if (replacedImage && current.imageKey() != null) {
            images.delete(current.imageKey());
        } else if (form.isRemoveImage() && current.imageKey() != null) {
            images.delete(current.imageKey());
        }
        return toSection(updated);
    }

    @PutMapping(value = "/api/admin/home/sections/order", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> reorder(@RequestBody HomeSectionOrder order) {
        if (order == null || order.ids() == null
                || new HashSet<>(order.ids()).size() != order.ids().size()
                || !repository.containsAllSections(order.ids())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L’ordre transmis ne correspond pas aux sections d’accueil.");
        }
        repository.reorder(order.ids());
        return ResponseEntity.noContent().build();
    }

    private List<String> allowedLayouts(String id) {
        return switch (id) {
            case "hero" -> List.of("hero", "hero-centered");
            case "intro" -> List.of("text", "image-left", "image-right");
            case "feature" -> List.of("image-left", "image-right", "text");
            case "quote" -> List.of("centered", "image-left", "image-right");
            default -> List.of();
        };
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

    private HomeSectionRecord findById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section d’accueil introuvable."));
    }

    private HomeSection toSection(HomeSectionRecord record) {
        String imageUrl = record.imageKey() == null
                ? record.imageUrl()
                : "/api/home/images/" + record.imageKey();
        return new HomeSection(record.id(), record.eyebrow(), record.title(), record.body(),
                record.linkLabel(), record.linkUrl(), record.signature(), record.layout(),
                record.sortOrder(), imageUrl);
    }

    private String storeImage(HomeSectionForm form) {
        try {
            return images.store(form.getImage());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }
}
