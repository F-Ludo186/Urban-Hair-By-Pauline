package fr.urbanhair.gallery;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:gallery-controller-test;DB_CLOSE_DELAY=-1",
        "admin.username=test-admin",
        "admin.password=test-password"
})
class GalleryControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private fr.urbanhair.storage.ImageUploadService images;

    @BeforeEach
    void resetGallery() {
        jdbc.update("DELETE FROM gallery_items");
        jdbc.update("DELETE FROM gallery_groups");
        jdbc.update("INSERT INTO gallery_groups (id, title) VALUES (?, ?)", "url-group", "Groupe URL");
    }

    @Test
    void adminCanCreateGalleryItemWithHttpsImageUrl() throws Exception {
        mockMvc.perform(multipart("/api/admin/gallery")
                        .param("title", "Photo hébergée")
                        .param("category", "BALAYAGE")
                        .param("groupId", "url-group")
                        .param("published", "true")
                        .param("imageUrl", "https://cdn.example.com/gallery/photo.jpg")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("https://cdn.example.com/gallery/photo.jpg"))
                .andExpect(jsonPath("$.groupId").value("url-group"));

        mockMvc.perform(get("/api/gallery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].imageUrl").value("https://cdn.example.com/gallery/photo.jpg"));
        verify(images, never()).store(any());
    }

    @Test
    void adminCanCreateNewGroupAndAddHttpsImageUrlWithoutUploadingFile() throws Exception {
        MvcResult groupResult = mockMvc.perform(post("/api/admin/gallery/groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Commande\"}")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andReturn();
        String groupId = objectMapper.readTree(groupResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(multipart("/api/admin/gallery")
                        .param("title", "Commande")
                        .param("category", "BALAYAGE")
                        .param("groupId", groupId)
                        .param("published", "true")
                        .param("imageUrl", "https://www.leshypotheques.com/images/commande.jpg")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("https://www.leshypotheques.com/images/commande.jpg"))
                .andExpect(jsonPath("$.groupId").value(groupId));

        verify(images, never()).store(any());
    }

    @Test
    void galleryRejectsNonHttpsImageUrl() throws Exception {
        mockMvc.perform(multipart("/api/admin/gallery")
                        .param("title", "Photo invalide")
                        .param("category", "BALAYAGE")
                        .param("groupId", "url-group")
                        .param("imageUrl", "http://cdn.example.com/gallery/photo.jpg")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deletingGroupAlsoDeletesItsPhotosAndStoredImageFiles() throws Exception {
        jdbc.update("INSERT INTO gallery_items (id, title, caption, category, image_key, published, sort_order, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "stored-photo", "Photo stockée", "", "BALAYAGE", "stored-key", true, 0, "url-group");
        jdbc.update("INSERT INTO gallery_items (id, title, caption, category, image_url, published, sort_order, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "external-photo", "Photo externe", "", "BALAYAGE", "https://cdn.example.com/photo.jpg", true, 1, "url-group");
        jdbc.update("INSERT INTO gallery_groups (id, title) VALUES (?, ?)", "other-group", "Autre groupe");
        jdbc.update("INSERT INTO gallery_items (id, title, caption, category, image_url, published, sort_order, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "other-photo", "Photo conservée", "", "BALAYAGE", "https://cdn.example.com/other.jpg", true, 0, "other-group");

        mockMvc.perform(delete("/api/admin/gallery/groups/url-group")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/gallery")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("other-photo"));
        mockMvc.perform(get("/api/gallery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("other-photo"));
        verify(images).delete("stored-key");
    }

    @Test
    void publicGalleryDoesNotShowPhotosWithoutAGroup() throws Exception {
        jdbc.update("INSERT INTO gallery_items (id, title, caption, category, image_url, published, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                "ungrouped-photo", "Photo sans groupe", "", "BALAYAGE", "https://cdn.example.com/ungrouped.jpg", true, 0);

        mockMvc.perform(get("/api/gallery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
