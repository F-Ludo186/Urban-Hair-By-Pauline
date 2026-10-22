package fr.urbanhair.gallery;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class GalleryRepository {
    private static final RowMapper<GalleryRecord> ROW_MAPPER = (result, row) -> new GalleryRecord(
            result.getString("id"),
            result.getString("title"),
            result.getString("caption"),
            result.getString("category"),
            result.getString("image_key"),
            result.getString("instagram_url"),
            result.getBoolean("published"));

    private final JdbcTemplate jdbc;

    public GalleryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<GalleryRecord> findAll() {
        return jdbc.query("SELECT * FROM gallery_items ORDER BY created_at DESC, id", ROW_MAPPER);
    }

    public List<GalleryRecord> findPublished() {
        return jdbc.query("SELECT * FROM gallery_items WHERE published = TRUE ORDER BY created_at DESC, id", ROW_MAPPER);
    }

    public Optional<GalleryRecord> findById(String id) {
        return jdbc.query("SELECT * FROM gallery_items WHERE id = ?", ROW_MAPPER, id).stream().findFirst();
    }

    public void insert(GalleryRecord item) {
        jdbc.update(
                "INSERT INTO gallery_items (id, title, caption, category, image_key, instagram_url, published) VALUES (?, ?, ?, ?, ?, ?, ?)",
                item.id(), item.title(), item.caption(), item.category(), item.imageKey(), item.instagramUrl(), item.published());
    }

    public void update(GalleryRecord item) {
        jdbc.update(
                "UPDATE gallery_items SET title = ?, caption = ?, category = ?, image_key = ?, instagram_url = ?, published = ? WHERE id = ?",
                item.title(), item.caption(), item.category(), item.imageKey(), item.instagramUrl(), item.published(), item.id());
    }

    public void delete(String id) {
        jdbc.update("DELETE FROM gallery_items WHERE id = ?", id);
    }
}
