package fr.urbanhair.gallery;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@Import(GalleryRepository.class)
class GalleryRepositoryTest {
    @Autowired
    private GalleryRepository repository;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void batchReordersGroupsAndGalleryItems() {
        jdbc.update("INSERT INTO gallery_groups (id, title) VALUES (?, ?)", "group-1", "Groupe 1");
        jdbc.update("INSERT INTO gallery_groups (id, title) VALUES (?, ?)", "group-2", "Groupe 2");
        insertItem("item-1", "group-1", 0);
        insertItem("item-2", "group-1", 1);
        insertItem("item-3", "group-2", 0);

        repository.reorderGroups(List.of("group-2", "group-1"));
        assertThat(jdbc.queryForList("SELECT id FROM gallery_groups ORDER BY sort_order", String.class))
                .containsExactly("group-2", "group-1");

        repository.reorderGroupItems("group-1", List.of("item-2", "item-1"));
        assertThat(jdbc.queryForList(
                "SELECT id FROM gallery_items WHERE group_id = ? ORDER BY sort_order", String.class, "group-1"))
                .containsExactly("item-2", "item-1");

        repository.reorder(List.of("item-3", "item-2", "item-1"));
        assertThat(jdbc.queryForList("SELECT id FROM gallery_items ORDER BY sort_order", String.class))
                .containsExactly("item-3", "item-2", "item-1");
    }

    @Test
    void deletingGalleryItemNormalizesRemainingGroupOrder() {
        jdbc.update("INSERT INTO gallery_groups (id, title) VALUES (?, ?)", "group-1", "Groupe 1");
        insertItem("item-1", "group-1", 0);
        insertItem("item-2", "group-1", 1);
        insertItem("item-3", "group-1", 2);

        repository.delete("item-2");

        assertThat(jdbc.queryForList(
                "SELECT id FROM gallery_items WHERE group_id = ? ORDER BY sort_order", String.class, "group-1"))
                .containsExactly("item-1", "item-3");
        assertThat(jdbc.queryForList(
                "SELECT sort_order FROM gallery_items WHERE group_id = ? ORDER BY sort_order", Integer.class, "group-1"))
                .containsExactly(0, 1);
    }

    private void insertItem(String id, String groupId, int sortOrder) {
        jdbc.update("""
                INSERT INTO gallery_items
                    (id, title, caption, category, image_key, published, sort_order, group_id)
                VALUES (?, ?, '', 'BALAYAGE', ?, TRUE, ?, ?)
                """, id, id, id + ".jpg", sortOrder, groupId);
    }
}
