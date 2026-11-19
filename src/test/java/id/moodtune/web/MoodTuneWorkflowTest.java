package id.moodtune.web;

import id.moodtune.repository.MoodJournalRepository;
import id.moodtune.repository.PlaylistRepository;
import id.moodtune.repository.PlaylistTrackRepository;
import id.moodtune.repository.SongRepository;
import id.moodtune.service.GeneratedPlaylistDraft;
import id.moodtune.service.MusicService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:moodtune-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "moodtune.gemini.api-key="
})
@AutoConfigureMockMvc
class MoodTuneWorkflowTest {
    @Autowired private MockMvc mvc;
    @Autowired private SongRepository songs;
    @Autowired private PlaylistRepository playlists;
    @Autowired private PlaylistTrackRepository tracks;
    @Autowired private MoodJournalRepository journals;
    @Autowired private MusicService music;

    @BeforeEach
    void clearDatabase() {
        journals.deleteAll();
        tracks.deleteAll();
        playlists.deleteAll();
        songs.deleteAll();
    }

    @Test
    void createsAndConnectsSongsPlaylistsAndMoodJournal() throws Exception {
        mvc.perform(post("/songs")
                        .param("title", "Test Track")
                        .param("artist", "Test Artist")
                        .param("genre", "Jazz")
                        .param("releaseYear", "2024")
                        .param("moodNote", "Quiet evening"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/songs"));
        var song = songs.findAll().get(0);

        mvc.perform(post("/playlists")
                        .param("name", "Test Mix")
                        .param("description", "A test playlist")
                        .param("moodTag", "Focus")
                        .param("coverVariant", "focus"))
                .andExpect(status().is3xxRedirection());
        var playlist = playlists.findAll().get(0);

        mvc.perform(post("/playlists/{id}/tracks", playlist.getId()).param("songId", song.getId().toString()))
                .andExpect(status().is3xxRedirection());
        mvc.perform(post("/playlists/{id}/tracks", playlist.getId()).param("songId", song.getId().toString()))
                .andExpect(status().is3xxRedirection());
        org.junit.jupiter.api.Assertions.assertEquals(1, tracks.findAll().size());
        mvc.perform(get("/playlists/{id}", playlist.getId()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Test Track")));

        mvc.perform(post("/journal")
                        .param("moodLabel", "Calm")
                        .param("energyLevel", "3")
                        .param("note", "A good day")
                        .param("linkedSongId", song.getId().toString())
                        .param("entryDate", "2026-11-19"))
                .andExpect(status().is3xxRedirection());
        mvc.perform(get("/journal"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("A good day")));
        mvc.perform(get("/insights"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Test Artist")));
        org.junit.jupiter.api.Assertions.assertEquals(1, journals.count());

        mvc.perform(post("/songs/{id}/delete", song.getId()))
                .andExpect(status().is3xxRedirection());
        org.junit.jupiter.api.Assertions.assertEquals(0, tracks.count());
        org.junit.jupiter.api.Assertions.assertNull(journals.findAll().get(0).getLinkedSong());

        var draft = new GeneratedPlaylistDraft("AI Test Mix", "Generated in test", "Focus", "focus",
                java.util.List.of(new GeneratedPlaylistDraft.Track("new", null, "Generated Track",
                        "Generated Artist", "Ambient", 2022, "Matches the mood")));
        var generated = music.saveGeneratedPlaylist(draft);
        org.junit.jupiter.api.Assertions.assertNotNull(generated.getId());
        org.junit.jupiter.api.Assertions.assertEquals(1, tracks.count());
        org.junit.jupiter.api.Assertions.assertEquals(0, tracks.findAll().get(0).getPosition());
    }

    @Test
    void showsClearMessageWhenGeminiIsNotConfigured() throws Exception {
        mvc.perform(post("/ai").param("mode", "recommend").param("prompt", "Fokus belajar"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("GEMINI_API_KEY")));
        mvc.perform(post("/ai").param("mode", "playlist").param("prompt", "Hujan sore"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("GEMINI_API_KEY")));
        mvc.perform(post("/ai/soundscape").param("prompt", "Rainy evening"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("GEMINI_API_KEY")));
    }

    @Test
    void rejectsInvalidSongInputWithoutSavingIt() throws Exception {
        mvc.perform(post("/songs")
                        .param("title", "Invalid Year")
                        .param("artist", "Test")
                        .param("genre", "Pop")
                        .param("releaseYear", "1800"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Tahun rilis minimal 1900.")));
        org.junit.jupiter.api.Assertions.assertEquals(0, songs.count());
    }
}
