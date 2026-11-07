package fr.urbanhair.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ExternalImageUrlTest {
    @Test
    void normalizesHttpsImageUrls() {
        assertThat(ExternalImageUrl.normalize("  https://cdn.example.com/photo.jpg  "))
                .isEqualTo("https://cdn.example.com/photo.jpg");
    }

    @Test
    void rejectsNonHttpsAndMalformedUrls() {
        assertThatThrownBy(() -> ExternalImageUrl.normalize("http://cdn.example.com/photo.jpg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ExternalImageUrl.normalize("https://"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ExternalImageUrl.normalize("https://user:password@cdn.example.com/photo.jpg"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
