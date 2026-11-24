package id.moodtune.web;

import id.moodtune.adapter.persistence.repository.MoodJournalRepository;
import id.moodtune.adapter.persistence.repository.PlaylistRepository;
import id.moodtune.adapter.persistence.repository.PlaylistTrackRepository;
import id.moodtune.adapter.persistence.repository.SongRepository;
import id.moodtune.usecase.dto.GeneratedPlaylistDraft;
import id.moodtune.usecase.port.AudioSearchPort;
import id.moodtune.usecase.port.AudioSearchPort.Preview;
import id.moodtune.usecase.port.AudioSearchPort.Video;
import id.moodtune.usecase.port.AudioSearchPort.VideoSearch;
import id.moodtune.usecase.MusicService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.when;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:moodtune-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "moodtune.gemini.api-key=",
        "moodtune.admin.password=test-password"
})
@AutoConfigureMockMvc(addFilters = false)
class MoodTuneWorkflowTest {
    @Autowired private MockMvc mvc;
    @Autowired private SongRepository songs;
    @Autowired private PlaylistRepository playlists;
    @Autowired private PlaylistTrackRepository tracks;
    @Autowired private MoodJournalRepository journals;
    @Autowired private MusicService music;
    @MockitoBean private AudioSearchPort audio;

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
    void showsLoadingFeedbackForAiRequests() throws Exception {
        mvc.perform(get("/ai"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("AI sedang menyiapkan jawaban")))
                .andExpect(content().string(containsString("AI sedang menyusun playlist")))
                .andExpect(content().string(containsString("AI sedang membuat soundscape")))
                .andExpect(content().string(containsString("/js/ai-loading.js")));
    }

    @Test
    void showsMoodDashboardAndUsesMoodPresetInAiStudio() throws Exception {
        mvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Musik yang mengerti suasana hatimu")))
                .andExpect(content().string(containsString("Apa yang kamu rasakan?")))
                .andExpect(content().string(containsString("Mini-player MoodTune")))
                .andExpect(content().string(containsString("/js/mini-player.js")));

        mvc.perform(get("/ai").param("mood", "galau"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Aku sedang merasa galau")));
    }

    @Test
    void rendersHomeAndPlaylistListWhenPlaylistHasTracks() throws Exception {
        mvc.perform(post("/songs")
                        .param("title", "Dashboard Track")
                        .param("artist", "Test Artist")
                        .param("genre", "Pop")
                        .param("releaseYear", "2024"))
                .andExpect(status().is3xxRedirection());
        var song = songs.findAll().get(0);

        mvc.perform(post("/playlists")
                        .param("name", "Dashboard Mix")
                        .param("moodTag", "Focus")
                        .param("coverVariant", "focus"))
                .andExpect(status().is3xxRedirection());
        var playlist = playlists.findAll().get(0);
        mvc.perform(post("/playlists/{id}/tracks", playlist.getId())
                        .param("songId", song.getId().toString()))
                .andExpect(status().is3xxRedirection());

        mvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Dashboard Mix")))
                .andExpect(content().string(containsString("Dashboard Track")));
        mvc.perform(get("/playlists"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Dashboard Mix")))
                .andExpect(content().string(containsString("1 lagu")));
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

    @Test
    void showsYouTubePlaybackWhenPreviewServiceIsUnavailable() throws Exception {
        when(audio.findPreview("Example Song", "Example Artist"))
                .thenThrow(new org.springframework.web.client.ResourceAccessException("iTunes unavailable"));
        when(audio.findVideos("Example Song", "Example Artist"))
                .thenReturn(new VideoSearch(
                        List.of(new Video("dQw4w9WgXcQ", "Example Song", "Example Artist")),
                        null));

        mvc.perform(get("/audio").param("title", "Example Song").param("artist", "Example Artist"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Pratinjau audio tidak dapat dimuat")))
                .andExpect(content().string(containsString("youtube-play-button")))
                .andExpect(content().string(containsString("Pratinjau Example Song")))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        containsString("https://www.youtube.com/watch?v="))));
    }

    @Test
    void showsPlaybackMessageWhenVideoSearchFailsWithoutRedirecting() throws Exception {
        when(audio.findPreview("Example Song", "Example Artist"))
                .thenReturn(new Preview(false, null, null, null, null, null,
                        "No preview"));
        when(audio.findVideos("Example Song", "Example Artist"))
                .thenThrow(new org.springframework.web.client.ResourceAccessException("YouTube unavailable"));

        mvc.perform(get("/audio").param("title", "Example Song").param("artist", "Example Artist"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Pencarian video gagal dimuat")))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        containsString("https://www.youtube.com/results?search_query="))));
    }
}
