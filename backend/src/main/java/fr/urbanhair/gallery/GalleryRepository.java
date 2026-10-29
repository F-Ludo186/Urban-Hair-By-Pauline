package fr.urbanhair.gallery;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class GalleryRepository {
    private static final RowMapper<GalleryRecord> ROW_MAPPER = (result, row) -> new GalleryRecord(
            result.getString("id"),
            result.getString("title"),
            result.getString("caption"),
            result.getString("category"),
            result.getString("image_key"),
            result.getString("instagram_url"),
            result.getBoolean("published"),
            result.getInt("sort_order"),
            result.getString("group_id"),
            result.getString("group_title"));

    private final JdbcTemplate jdbc;

    public GalleryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<GalleryRecord> findAll() {
        return jdbc.query("SELECT i.*, g.title AS group_title FROM gallery_items i LEFT JOIN gallery_groups g ON i.group_id = g.id ORDER BY i.sort_order, i.created_at DESC, i.id", ROW_MAPPER);
    }

    public List<GalleryRecord> findPublished() {
        return jdbc.query("SELECT i.*, g.title AS group_title FROM gallery_items i LEFT JOIN gallery_groups g ON i.group_id = g.id WHERE i.published = TRUE ORDER BY i.sort_order, i.created_at DESC, i.id", ROW_MAPPER);
    }

    public Optional<GalleryRecord> findById(String id) {
        return jdbc.query("SELECT i.*, g.title AS group_title FROM gallery_items i LEFT JOIN gallery_groups g ON i.group_id = g.id WHERE i.id = ?", ROW_MAPPER, id).stream().findFirst();
    }

    public void insert(GalleryRecord item) {
        jdbc.update(
                "INSERT INTO gallery_items (id, title, caption, category, image_key, instagram_url, published, sort_order, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                item.id(), item.title(), item.caption(), item.category(), item.imageKey(), item.instagramUrl(), item.published(), nextSortOrder(), item.groupId());
    }

    public void update(GalleryRecord item) {
        jdbc.update(
                "UPDATE gallery_items SET title = ?, caption = ?, category = ?, image_key = ?, instagram_url = ?, published = ?, group_id = ? WHERE id = ?",
                item.title(), item.caption(), item.category(), item.imageKey(), item.instagramUrl(), item.published(), item.groupId(), item.id());
    }

    public void delete(String id) {
        jdbc.update("DELETE FROM gallery_items WHERE id = ?", id);
    }

    public List<GalleryGroup> findGroups() {
        return jdbc.query("SELECT g.id, g.title, COUNT(i.id) AS item_count FROM gallery_groups g LEFT JOIN gallery_items i ON i.group_id = g.id GROUP BY g.id, g.title, g.created_at ORDER BY g.created_at, g.title",
                (result, row) -> new GalleryGroup(result.getString("id"), result.getString("title"), result.getInt("item_count")));
    }

    public Optional<GalleryGroup> findGroupById(String id) {
        return jdbc.query("SELECT g.id, g.title, COUNT(i.id) AS item_count FROM gallery_groups g LEFT JOIN gallery_items i ON i.group_id = g.id WHERE g.id = ? GROUP BY g.id, g.title, g.created_at",
                (result, row) -> new GalleryGroup(result.getString("id"), result.getString("title"), result.getInt("item_count")), id).stream().findFirst();
    }

    public void insertGroup(GalleryGroup group) {
        jdbc.update("INSERT INTO gallery_groups (id, title) VALUES (?, ?)", group.id(), group.title());
    }

    public void updateGroup(String id, String title) {
        jdbc.update("UPDATE gallery_groups SET title = ? WHERE id = ?", title, id);
    }

    @Transactional
    public void assignGroup(String groupId, List<String> ids) {
        for (String id : ids) {
            jdbc.update("UPDATE gallery_items SET group_id = ? WHERE id = ?", groupId, id);
        }
    }

    public boolean containsItems(List<String> ids) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_items WHERE id IN (" + String.join(",", java.util.Collections.nCopies(ids.size(), "?")) + ")", Integer.class, ids.toArray());
        return count != null && count == ids.size();
    }

    @Transactional
    public void deleteGroup(String id) {
        jdbc.update("UPDATE gallery_items SET group_id = NULL WHERE group_id = ?", id);
        jdbc.update("DELETE FROM gallery_groups WHERE id = ?", id);
    }

    @Transactional
    public void reorder(List<String> ids) {
        for (int index = 0; index < ids.size(); index++) {
            jdbc.update("UPDATE gallery_items SET sort_order = ? WHERE id = ?", index, ids.get(index));
        }
    }

    public boolean containsAllIds(List<String> ids) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_items", Integer.class);
        return count != null && count == ids.size() && jdbc.queryForList(
                "SELECT id FROM gallery_items", String.class).containsAll(ids);
    }

    private int nextSortOrder() {
        Integer current = jdbc.queryForObject("SELECT COALESCE(MAX(sort_order), -1) FROM gallery_items", Integer.class);
        return current == null ? 0 : current + 1;
    }
}
