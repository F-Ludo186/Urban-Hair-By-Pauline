package fr.urbanhair.gallery;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gallery")
public class GalleryController {
    private final List<GalleryItem> items = List.of(
            new GalleryItem("lumiere-naturelle", "Lumière naturelle", "BALAYAGE", "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=85"),
            new GalleryItem("reflets-cuivres", "Reflets cuivrés", "COLORATION", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85"),
            new GalleryItem("carre-doux", "Le carré doux", "COUPE", "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1000&q=85"),
            new GalleryItem("ondulations-libres", "Ondulations libres", "COIFFAGE", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85"),
            new GalleryItem("brun-profond", "Brun profond", "COLORATION", "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85"),
            new GalleryItem("mouvement-naturel", "Mouvement naturel", "COUPE", "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=1000&q=85")
    );

    @GetMapping
    public List<GalleryItem> getGallery() {
        return items;
    }
}
