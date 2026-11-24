package id.moodtune.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:moodtune-security-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "moodtune.gemini.api-key=",
        "moodtune.admin.username=admin",
        "moodtune.admin.password=admin23"
})
@AutoConfigureMockMvc
class SecurityConfigTest {
    @Autowired private MockMvc mvc;

    @Test
    void requiresLoginProtectsPagesAndSupportsLogout() throws Exception {
        mvc.perform(get("/songs"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("http://localhost/login"));

        mvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Masuk ke MoodTune")));

        mvc.perform(post("/login").with(csrf())
                        .param("username", "admin")
                        .param("password", "wrong-password"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?error"));

        var login = mvc.perform(post("/login").with(csrf())
                        .param("username", "admin")
                        .param("password", "admin23"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/songs"))
                .andExpect(authenticated().withUsername("admin"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(get("/songs").session(session))
                .andExpect(status().isOk())
                .andExpect(authenticated().withUsername("admin"));

        mvc.perform(post("/logout").with(csrf()).session(session))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?logout"));

        mvc.perform(get("/songs").session(session))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("http://localhost/login"));
    }
}
