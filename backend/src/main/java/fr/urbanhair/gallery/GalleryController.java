package fr.urbanhair.gallery;

import fr.urbanhair.storage.ImageNotFoundException;
import fr.urbanhair.storage.ImageUploadService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.HashSet;
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

    @GetMapping("/api/admin/gallery/groups")
    public List<GalleryGroup> getGroups() {
        return repository.findGroups();
    }

    @PostMapping("/api/admin/gallery/groups")
    public ResponseEntity<GalleryGroup> createGroup(@Valid @RequestBody GalleryGroupRequest request) {
        GalleryGroup group = new GalleryGroup(UUID.randomUUID().toString(), request.title().trim(), 0);
        repository.insertGroup(group);
        return ResponseEntity.status(HttpStatus.CREATED).body(group);
    }

    @PutMapping("/api/admin/gallery/groups/{id}")
    public GalleryGroup updateGroup(@PathVariable String id, @Valid @RequestBody GalleryGroupRequest request) {
        GalleryGroup current = findGroup(id);
        repository.updateGroup(id, request.title().trim());
        return new GalleryGroup(id, request.title().trim(), current.itemCount());
    }

    @DeleteMapping("/api/admin/gallery/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable String id) {
        findGroup(id);
        repository.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/api/admin/gallery/groups/{id}/items", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> assignItemsToGroup(@PathVariable String id, @RequestBody GalleryGroupSelection selection) {
        findGroup(id);
        if (selection == null || selection.ids() == null || selection.ids().isEmpty()
                || new HashSet<>(selection.ids()).size() != selection.ids().size()
                || !repository.containsItems(selection.ids())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La sélection de photos est invalide.");
        }
        repository.assignGroup(id, selection.ids());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/api/admin/gallery", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GalleryItem> create(@Valid @ModelAttribute GalleryForm form, BindingResult validation) {
        validate(validation);
        String groupId = emptyToNull(form.getGroupId());
        GalleryGroup group = findOptionalGroup(groupId);
        String key = storeImage(form);
        GalleryRecord item = new GalleryRecord(
                UUID.randomUUID().toString(), form.getTitle(), form.getCaption(), form.getCategory(),
                key, emptyToNull(form.getInstagramUrl()), form.isPublished(), 0, groupId, group == null ? null : group.title());
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
        String groupId = emptyToNull(form.getGroupId());
        GalleryGroup group = findOptionalGroup(groupId);
        String key = current.imageKey();
        boolean replacedImage = form.getImage() != null && !form.getImage().isEmpty();
        if (replacedImage) {
            key = storeImage(form);
        }
        GalleryRecord updated = new GalleryRecord(
                current.id(), form.getTitle(), form.getCaption(), form.getCategory(),
                key, emptyToNull(form.getInstagramUrl()), form.isPublished(), current.sortOrder(), groupId, group == null ? null : group.title());
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

    @PutMapping(value = "/api/admin/gallery/order", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> reorder(@RequestBody GalleryOrder order) {
        if (order == null || order.ids() == null || new HashSet<>(order.ids()).size() != order.ids().size()
                || !repository.containsAllIds(order.ids())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L’ordre transmis ne correspond pas à la galerie.");
        }
        repository.reorder(order.ids());
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

    private GalleryGroup findGroup(String id) {
        return repository.findGroupById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Groupe introuvable."));
    }

    private GalleryGroup findOptionalGroup(String id) {
        if (id == null) return null;
        return repository.findGroupById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le groupe sélectionné n’existe plus."));
    }

    private GalleryItem toItem(GalleryRecord record) {
        return new GalleryItem(
                record.id(), record.title(), record.caption(), record.category(),
                "/api/gallery/images/" + record.imageKey(), record.instagramUrl(), record.published(), record.groupId(), record.groupTitle());
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
