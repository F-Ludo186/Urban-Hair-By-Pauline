package fr.urbanhair.gallery;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class GalleryRepository {
    private static final String ITEM_SELECT = "SELECT i.*, g.title AS group_title, g.description AS group_description, g.sort_order AS group_sort_order, g.cover_item_id AS group_cover_item_id FROM gallery_items i LEFT JOIN gallery_groups g ON i.group_id = g.id";
    private static final RowMapper<GalleryRecord> ITEM_MAPPER = (result, row) -> new GalleryRecord(
            result.getString("id"), result.getString("title"), result.getString("caption"),
            result.getString("category"), result.getString("image_key"), result.getString("instagram_url"),
            result.getBoolean("published"), result.getInt("sort_order"), result.getString("group_id"),
            result.getString("group_title"), result.getString("group_description"), result.getInt("group_sort_order"),
            result.getString("group_cover_item_id"));

    private static final RowMapper<GalleryGroup> GROUP_MAPPER = (result, row) -> new GalleryGroup(
            result.getString("id"), result.getString("title"), result.getString("description"),
            result.getInt("item_count"), result.getInt("sort_order"), result.getString("cover_item_id"));

    private final JdbcTemplate jdbc;

    public GalleryRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<GalleryRecord> findAll() {
        return jdbc.query(ITEM_SELECT + " ORDER BY CASE WHEN g.id IS NULL THEN 1 ELSE 0 END, g.sort_order, i.sort_order, i.created_at DESC, i.id", ITEM_MAPPER);
    }

    public List<GalleryRecord> findPublished() {
        return jdbc.query(ITEM_SELECT + " WHERE i.published = TRUE ORDER BY CASE WHEN g.id IS NULL THEN 1 ELSE 0 END, g.sort_order, i.sort_order, i.created_at DESC, i.id", ITEM_MAPPER);
    }

    public Optional<GalleryRecord> findById(String id) {
        return jdbc.query(ITEM_SELECT + " WHERE i.id = ?", ITEM_MAPPER, id).stream().findFirst();
    }

    @Transactional
    public void insert(GalleryRecord item) {
        jdbc.update("INSERT INTO gallery_items (id, title, caption, category, image_key, instagram_url, published, sort_order, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                item.id(), item.title(), item.caption(), item.category(), item.imageKey(), item.instagramUrl(),
                item.published(), nextItemSortOrder(item.groupId()), item.groupId());
        ensureGroupCover(item.groupId());
    }

    @Transactional
    public void update(GalleryRecord item) {
        String previousGroupId = nullableString("SELECT group_id FROM gallery_items WHERE id = ?", item.id());
        Boolean previousPublished = jdbc.queryForObject("SELECT published FROM gallery_items WHERE id = ?", Boolean.class, item.id());
        jdbc.update("UPDATE gallery_items SET title = ?, caption = ?, category = ?, image_key = ?, instagram_url = ?, published = ?, group_id = ? WHERE id = ?",
                item.title(), item.caption(), item.category(), item.imageKey(), item.instagramUrl(), item.published(), item.groupId(), item.id());
        if (!java.util.Objects.equals(previousGroupId, item.groupId()) || !java.util.Objects.equals(previousPublished, item.published())) {
            ensureGroupCover(previousGroupId);
            ensureGroupCover(item.groupId());
            normalizeGroupItems(previousGroupId);
            normalizeGroupItems(item.groupId());
        }
    }

    @Transactional
    public void delete(String id) {
        String groupId = nullableString("SELECT group_id FROM gallery_items WHERE id = ?", id);
        jdbc.update("DELETE FROM gallery_items WHERE id = ?", id);
        ensureGroupCover(groupId);
        normalizeGroupItems(groupId);
    }

    public List<GalleryGroup> findGroups() {
        return jdbc.query("SELECT g.id, g.title, g.description, COUNT(i.id) AS item_count, g.sort_order, g.cover_item_id FROM gallery_groups g LEFT JOIN gallery_items i ON i.group_id = g.id GROUP BY g.id, g.title, g.description, g.created_at, g.sort_order, g.cover_item_id ORDER BY g.sort_order, g.created_at, g.title", GROUP_MAPPER);
    }

    public Optional<GalleryGroup> findGroupById(String id) {
        return jdbc.query("SELECT g.id, g.title, g.description, COUNT(i.id) AS item_count, g.sort_order, g.cover_item_id FROM gallery_groups g LEFT JOIN gallery_items i ON i.group_id = g.id WHERE g.id = ? GROUP BY g.id, g.title, g.description, g.created_at, g.sort_order, g.cover_item_id", GROUP_MAPPER, id).stream().findFirst();
    }

    @Transactional
    public void insertGroup(GalleryGroup group) {
        jdbc.update("INSERT INTO gallery_groups (id, title, description, sort_order, cover_item_id) VALUES (?, ?, ?, ?, ?)",
                group.id(), group.title(), group.description(), nextGroupSortOrder(), group.coverItemId());
    }

    public void updateGroup(String id, String title, String description) {
        jdbc.update("UPDATE gallery_groups SET title = ?, description = ? WHERE id = ?", title, description, id);
    }

    public void setGroupCover(String groupId, String itemId) {
        jdbc.update("UPDATE gallery_groups SET cover_item_id = ? WHERE id = ?", itemId, groupId);
    }

    public boolean itemCanBeGroupCover(String itemId, String groupId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_items WHERE id = ? AND group_id = ? AND published = TRUE", Integer.class, itemId, groupId);
        return count != null && count == 1;
    }

    @Transactional
    public void assignGroup(String groupId, List<String> ids) {
        List<String> previousGroups = jdbc.query("SELECT DISTINCT group_id FROM gallery_items WHERE id IN (" + placeholders(ids.size()) + ") AND group_id IS NOT NULL",
                (result, row) -> result.getString(1), ids.toArray());
        for (String id : ids) jdbc.update("UPDATE gallery_items SET group_id = ? WHERE id = ?", groupId, id);
        previousGroups.forEach(previousGroup -> {
            ensureGroupCover(previousGroup);
            normalizeGroupItems(previousGroup);
        });
        ensureGroupCover(groupId);
        normalizeGroupItems(groupId);
    }

    public boolean containsItems(List<String> ids) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_items WHERE id IN (" + placeholders(ids.size()) + ")", Integer.class, ids.toArray());
        return count != null && count == ids.size();
    }

    public boolean containsGroupItems(String groupId, List<String> ids) {
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_items WHERE group_id = ?", Integer.class, groupId);
        if (ids.isEmpty()) return total != null && total == 0;
        Object[] arguments = new Object[ids.size() + 1];
        arguments[0] = groupId;
        for (int index = 0; index < ids.size(); index++) arguments[index + 1] = ids.get(index);
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_items WHERE group_id = ? AND id IN (" + placeholders(ids.size()) + ")", Integer.class, arguments);
        return count != null && total != null && count == ids.size() && total == ids.size();
    }

    @Transactional
    public void deleteGroup(String id) {
        jdbc.update("UPDATE gallery_items SET group_id = NULL WHERE group_id = ?", id);
        jdbc.update("DELETE FROM gallery_groups WHERE id = ?", id);
    }

    @Transactional
    public void reorderGroups(List<String> ids) {
        batchUpdateOrder("UPDATE gallery_groups SET sort_order = ? WHERE id = ?", ids, null);
    }

    public boolean containsAllGroups(List<String> ids) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_groups", Integer.class);
        return count != null && count == ids.size() && jdbc.queryForList("SELECT id FROM gallery_groups", String.class).containsAll(ids);
    }

    @Transactional
    public void reorderGroupItems(String groupId, List<String> ids) {
        batchUpdateOrder("UPDATE gallery_items SET sort_order = ? WHERE id = ? AND group_id = ?", ids, groupId);
    }

    @Transactional
    public void reorder(List<String> ids) {
        batchUpdateOrder("UPDATE gallery_items SET sort_order = ? WHERE id = ?", ids, null);
    }

    public boolean containsAllIds(List<String> ids) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gallery_items", Integer.class);
        return count != null && count == ids.size() && jdbc.queryForList("SELECT id FROM gallery_items", String.class).containsAll(ids);
    }

    private void ensureGroupCover(String groupId) {
        if (groupId == null) return;
        String coverId = nullableString("SELECT cover_item_id FROM gallery_groups WHERE id = ?", groupId);
        if (coverId != null && itemCanBeGroupCover(coverId, groupId)) return;
        List<String> items = jdbc.query("SELECT id FROM gallery_items WHERE group_id = ? AND published = TRUE ORDER BY sort_order, created_at, id", (result, row) -> result.getString(1), groupId);
        jdbc.update("UPDATE gallery_groups SET cover_item_id = ? WHERE id = ?", items.isEmpty() ? null : items.get(0), groupId);
    }

    private void normalizeGroupItems(String groupId) {
        if (groupId == null) return;
        List<String> ids = jdbc.query("SELECT id FROM gallery_items WHERE group_id = ? ORDER BY sort_order, created_at, id", (result, row) -> result.getString(1), groupId);
        for (int index = 0; index < ids.size(); index++) jdbc.update("UPDATE gallery_items SET sort_order = ? WHERE id = ?", index, ids.get(index));
    }

    private int nextItemSortOrder(String groupId) {
        String query = groupId == null
                ? "SELECT COALESCE(MAX(sort_order), -1) FROM gallery_items WHERE group_id IS NULL"
                : "SELECT COALESCE(MAX(sort_order), -1) FROM gallery_items WHERE group_id = ?";
        Integer current = groupId == null ? jdbc.queryForObject(query, Integer.class) : jdbc.queryForObject(query, Integer.class, groupId);
        return current == null ? 0 : current + 1;
    }

    private int nextGroupSortOrder() {
        Integer current = jdbc.queryForObject("SELECT COALESCE(MAX(sort_order), -1) FROM gallery_groups", Integer.class);
        return current == null ? 0 : current + 1;
    }

    private String nullableString(String sql, Object... arguments) {
        List<String> values = jdbc.query(sql, (result, row) -> result.getString(1), arguments);
        return values.isEmpty() ? null : values.get(0);
    }

    private String placeholders(int count) {
        return String.join(",", java.util.Collections.nCopies(count, "?"));
    }

    private void batchUpdateOrder(String sql, List<String> ids, String groupId) {
        if (ids.isEmpty()) return;
        List<Object[]> batch = new ArrayList<>(ids.size());
        for (int index = 0; index < ids.size(); index++) {
            batch.add(groupId == null
                    ? new Object[] { index, ids.get(index) }
                    : new Object[] { index, ids.get(index), groupId });
        }
        jdbc.batchUpdate(sql, batch);
    }
}
