package fr.urbanhair.home;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:home-controller-test;DB_CLOSE_DELAY=-1",
        "admin.username=test-admin",
        "admin.password=test-admin-password-long"
})
class HomeControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetSections() {
        jdbc.update("""
                UPDATE home_sections
                SET sort_order = CASE id
                    WHEN 'hero' THEN 0 WHEN 'intro' THEN 1 WHEN 'feature' THEN 2 WHEN 'quote' THEN 3
                END
                """);
        jdbc.update("""
                UPDATE home_sections
                SET eyebrow = 'L’ESPRIT URBAN HAIR', title = 'La beauté prend son temps.',
                    body = 'Chez Urban Hair by Pauline, chaque rendez-vous est une rencontre.',
                    link_label = 'Explorer nos réalisations', link_url = '/galerie',
                    layout = 'text', image_key = NULL, image_url = NULL
                WHERE id = 'intro'
                """);
    }

    @Test
    void publicHomeReturnsAllFourPersistedSections() throws Exception {
        mockMvc.perform(get("/api/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].id").value("hero"))
                .andExpect(jsonPath("$[1].id").value("intro"))
                .andExpect(jsonPath("$[1].title").value("La beauté prend son temps."));
    }

    @Test
    void adminCanEditSectionAndReorderThePublicPage() throws Exception {
        mockMvc.perform(multipart("/api/admin/home/intro")
                        .param("eyebrow", "NOTRE HISTOIRE")
                        .param("title", "Un accueil personnalisé")
                        .param("body", "Un nouveau texte de présentation.")
                        .param("linkLabel", "Voir la galerie")
                        .param("linkUrl", "/galerie")
                        .param("signature", "")
                        .param("layout", "image-right")
                        .param("removeImage", "false")
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        })
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Un accueil personnalisé"))
                .andExpect(jsonPath("$.layout").value("image-right"));

        mockMvc.perform(put("/api/admin/home/sections/order")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[\"quote\",\"feature\",\"intro\",\"hero\"]}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("quote"))
                .andExpect(jsonPath("$[2].title").value("Un accueil personnalisé"));
    }

    @Test
    void adminHomeEndpointsRequireAnAdministratorSession() throws Exception {
        mockMvc.perform(get("/api/admin/home"))
                .andExpect(status().isUnauthorized());
    }
}
