package fr.urbanhair.home;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class HomeSectionRepository {
    private static final String SELECT_COLUMNS = "SELECT id, eyebrow, title, body, link_label, link_url, signature, layout, sort_order, image_key, image_url FROM home_sections";
    private static final RowMapper<HomeSectionRecord> MAPPER = (result, row) -> new HomeSectionRecord(
            result.getString("id"), result.getString("eyebrow"), result.getString("title"),
            result.getString("body"), result.getString("link_label"), result.getString("link_url"),
            result.getString("signature"), result.getString("layout"), result.getInt("sort_order"),
            result.getString("image_key"), result.getString("image_url"));

    private final JdbcTemplate jdbc;

    public HomeSectionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<HomeSectionRecord> findAll() {
        return jdbc.query(SELECT_COLUMNS + " ORDER BY sort_order, id", MAPPER);
    }

    public Optional<HomeSectionRecord> findById(String id) {
        return jdbc.query(SELECT_COLUMNS + " WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public int update(HomeSectionRecord section) {
        return jdbc.update("""
                UPDATE home_sections
                SET eyebrow = ?, title = ?, body = ?, link_label = ?, link_url = ?,
                    signature = ?, layout = ?, image_key = ?, image_url = ?
                WHERE id = ?
                """, section.eyebrow(), section.title(), section.body(), section.linkLabel(),
                section.linkUrl(), section.signature(), section.layout(), section.imageKey(),
                section.imageUrl(), section.id());
    }

    public boolean containsAllSections(List<String> ids) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM home_sections", Integer.class);
        if (count == null || count != ids.size()) return false;
        List<String> existing = jdbc.queryForList("SELECT id FROM home_sections", String.class);
        return existing.size() == ids.size() && existing.containsAll(ids);
    }

    @Transactional
    public void reorder(List<String> ids) {
        for (int index = 0; index < ids.size(); index++) {
            jdbc.update("UPDATE home_sections SET sort_order = ? WHERE id = ?", index, ids.get(index));
        }
    }
}
