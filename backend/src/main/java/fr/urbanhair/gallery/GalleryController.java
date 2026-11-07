package fr.urbanhair.gallery;

import fr.urbanhair.storage.ImageNotFoundException;
import fr.urbanhair.storage.ImageUploadService;
import fr.urbanhair.storage.ExternalImageUrl;
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
        GalleryGroup group = new GalleryGroup(UUID.randomUUID().toString(), request.title().trim(), emptyToNull(request.description()) == null ? "" : request.description().trim(), 0, 0, null);
        repository.insertGroup(group);
        return ResponseEntity.status(HttpStatus.CREATED).body(findGroup(group.id()));
    }

    @PutMapping("/api/admin/gallery/groups/{id}")
    public GalleryGroup updateGroup(@PathVariable("id") String id, @Valid @RequestBody GalleryGroupRequest request) {
        GalleryGroup current = findGroup(id);
        String description = emptyToNull(request.description()) == null ? "" : request.description().trim();
        repository.updateGroup(id, request.title().trim(), description);
        return new GalleryGroup(id, request.title().trim(), description, current.itemCount(), current.sortOrder(), current.coverItemId());
    }

    @PutMapping("/api/admin/gallery/groups/order")
    public ResponseEntity<Void> reorderGroups(@RequestBody GalleryOrder order) {
        if (order == null || order.ids() == null || new HashSet<>(order.ids()).size() != order.ids().size()
                || !repository.containsAllGroups(order.ids())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L’ordre transmis ne correspond pas aux groupes.");
        }
        repository.reorderGroups(order.ids());
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/api/admin/gallery/groups/{id}/cover", consumes = MediaType.APPLICATION_JSON_VALUE)
    public GalleryGroup setGroupCover(@PathVariable("id") String id, @RequestBody GalleryGroupCover request) {
        GalleryGroup group = findGroup(id);
        if (request == null || request.itemId() == null || !repository.itemCanBeGroupCover(request.itemId(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez une photo publiée appartenant à ce groupe.");
        }
        repository.setGroupCover(id, request.itemId());
        return new GalleryGroup(group.id(), group.title(), group.description(), group.itemCount(), group.sortOrder(), request.itemId());
    }

    @DeleteMapping("/api/admin/gallery/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable("id") String id) {
        findGroup(id);
        List<GalleryRecord> items = repository.findByGroupId(id);
        repository.deleteGroup(id);
        items.stream().map(GalleryRecord::imageKey).filter(key -> key != null).forEach(images::delete);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/api/admin/gallery/groups/{id}/items", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> assignItemsToGroup(@PathVariable("id") String id, @RequestBody GalleryGroupSelection selection) {
        findGroup(id);
        if (selection == null || selection.ids() == null || selection.ids().isEmpty()
                || new HashSet<>(selection.ids()).size() != selection.ids().size()
                || !repository.containsItems(selection.ids())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La sélection de photos est invalide.");
        }
        repository.assignGroup(id, selection.ids());
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/api/admin/gallery/groups/{id}/items/order", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> reorderGroupItems(@PathVariable("id") String id, @RequestBody GalleryOrder order) {
        findGroup(id);
        if (order == null || order.ids() == null || new HashSet<>(order.ids()).size() != order.ids().size()
                || !repository.containsGroupItems(id, order.ids())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L’ordre transmis ne correspond pas aux photos du groupe.");
        }
        repository.reorderGroupItems(id, order.ids());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/api/admin/gallery", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GalleryItem> create(@Valid @ModelAttribute GalleryForm form, BindingResult validation) {
        String imageUrl = validate(form, validation, true);
        String groupId = emptyToNull(form.getGroupId());
        GalleryGroup group = findOptionalGroup(groupId);
        String key = hasImageFile(form) ? storeImage(form) : null;
        GalleryRecord item = new GalleryRecord(
                UUID.randomUUID().toString(), form.getTitle(), form.getCaption(), form.getCategory(),
                key, imageUrl, emptyToNull(form.getInstagramUrl()), form.isPublished(), 0, groupId, group == null ? null : group.title(),
                group == null ? null : group.description(), group == null ? 0 : group.sortOrder(), group == null ? null : group.coverItemId());
        try {
            repository.insert(item);
        } catch (RuntimeException exception) {
            if (key != null) images.delete(key);
            throw exception;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(toItem(findById(item.id())));
    }

    @PutMapping(value = "/api/admin/gallery/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public GalleryItem update(
            @PathVariable("id") String id,
            @Valid @ModelAttribute GalleryForm form,
            BindingResult validation) {
        String requestedImageUrl = validate(form, validation, false);
        GalleryRecord current = findById(id);
        String groupId = emptyToNull(form.getGroupId());
        GalleryGroup group = findOptionalGroup(groupId);
        String key = current.imageKey();
        boolean replacedImage = hasImageFile(form);
        boolean replacedWithUrl = requestedImageUrl != null;
        if (replacedImage && replacedWithUrl) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez un fichier ou une URL pour la photo, pas les deux.");
        }
        if (replacedImage) {
            key = storeImage(form);
        } else if (replacedWithUrl) key = null;
        String imageUrl = replacedImage ? null : replacedWithUrl ? requestedImageUrl : current.imageUrl();
        GalleryRecord updated = new GalleryRecord(
                current.id(), form.getTitle(), form.getCaption(), form.getCategory(),
                key, imageUrl, emptyToNull(form.getInstagramUrl()), form.isPublished(), current.sortOrder(), groupId, group == null ? null : group.title(),
                group == null ? null : group.description(), group == null ? 0 : group.sortOrder(), group == null ? null : group.coverItemId());
        try {
            repository.update(updated);
        } catch (RuntimeException exception) {
            if (replacedImage) {
                images.delete(key);
            }
            throw exception;
        }
        if ((replacedImage || replacedWithUrl) && current.imageKey() != null) {
            images.delete(current.imageKey());
        }
        return toItem(findById(id));
    }

    @DeleteMapping("/api/admin/gallery/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") String id) {
        GalleryRecord item = findById(id);
        repository.delete(id);
        if (item.imageKey() != null) images.delete(item.imageKey());
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

    private String validate(GalleryForm form, BindingResult result, boolean creating) {
        if (result.hasErrors()) {
            String message = result.getFieldErrors().stream()
                    .map(error -> error.getField() + " : " + error.getDefaultMessage())
                    .findFirst()
                    .orElse("Les informations saisies sont invalides.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        String imageUrl;
        try {
            imageUrl = ExternalImageUrl.normalize(form.getImageUrl());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
        boolean hasImageFile = hasImageFile(form);
        if (hasImageFile && imageUrl != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez un fichier ou une URL pour la photo, pas les deux.");
        }
        if (creating && !hasImageFile && imageUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ajoutez une photo ou saisissez son URL HTTPS.");
        }
        return imageUrl;
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
        String imageUrl = record.imageKey() == null
                ? record.imageUrl()
                : "/api/gallery/images/" + record.imageKey();
        return new GalleryItem(
                record.id(), record.title(), record.caption(), record.category(),
                imageUrl, record.instagramUrl(), record.published(), record.groupId(), record.groupTitle(),
                record.groupDescription(), record.groupSortOrder(), record.groupCoverItemId());
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

    private boolean hasImageFile(GalleryForm form) { return form.getImage() != null && !form.getImage().isEmpty(); }
}
