package fr.urbanhair.home;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;

@JdbcTest
@Import(HomeSectionRepository.class)
class HomeSectionRepositoryTest {
    @Autowired
    private HomeSectionRepository repository;

    @Test
    void initializesTheFourHomeSectionsAndKeepsTheirContentAndOrder() {
        assertThat(repository.findAll())
                .extracting(HomeSectionRecord::id)
                .containsExactly("hero", "intro", "feature", "quote");

        HomeSectionRecord intro = repository.findById("intro").orElseThrow();
        HomeSectionRecord updated = new HomeSectionRecord(
                intro.id(), "NOTRE HISTOIRE", "Une beauté à votre image", "Un texte renouvelé.",
                "Voir la galerie", "/galerie", "", "image-right", intro.sortOrder(),
                "nouvelle-image.jpg", null);
        assertThat(repository.update(updated)).isEqualTo(1);

        repository.reorder(List.of("quote", "feature", "intro", "hero"));

        assertThat(repository.findAll())
                .extracting(HomeSectionRecord::id)
                .containsExactly("quote", "feature", "intro", "hero");
        assertThat(repository.findById("intro"))
                .get()
                .satisfies(saved -> {
                    assertThat(saved.title()).isEqualTo("Une beauté à votre image");
                    assertThat(saved.layout()).isEqualTo("image-right");
                    assertThat(saved.imageKey()).isEqualTo("nouvelle-image.jpg");
                });
    }

    @Test
    void rejectsAnOrderThatDoesNotContainEverySection() {
        assertThat(repository.containsAllSections(List.of("hero", "intro", "feature", "quote"))).isTrue();
        assertThat(repository.containsAllSections(List.of("hero", "intro", "feature"))).isFalse();
        assertThat(repository.containsAllSections(List.of("hero", "intro", "feature", "other"))).isFalse();
    }
}
