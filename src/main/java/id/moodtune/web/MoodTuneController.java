package id.moodtune.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import id.moodtune.model.MoodJournal;
import id.moodtune.model.Playlist;
import id.moodtune.model.Song;
import id.moodtune.service.AudioLookupService;
import id.moodtune.service.GeneratedPlaylistDraft;
import id.moodtune.service.SoundscapeBlueprint;
import id.moodtune.repository.SongRepository;
import id.moodtune.service.GeminiService;
import id.moodtune.service.MusicService;
import id.moodtune.web.form.JournalForm;
import id.moodtune.web.form.PlaylistForm;
import id.moodtune.web.form.SongForm;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import java.util.List;

@Controller
@SessionAttributes("generatedDraft")
public class MoodTuneController {
    private final MusicService music;
    private final SongRepository songs;
    private final GeminiService gemini;
    private final AudioLookupService audio;
    private final ObjectMapper objectMapper;

    public MoodTuneController(MusicService music, SongRepository songs, GeminiService gemini,
                              AudioLookupService audio, ObjectMapper objectMapper) {
        this.music = music;
        this.songs = songs;
        this.gemini = gemini;
        this.audio = audio;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/songs";
    }

    @GetMapping("/songs")
    public String songs(Model model) {
        model.addAttribute("songs", music.songs());
        model.addAttribute("activeTab", "songs");
        return "songs";
    }

    @GetMapping("/songs/new")
    public String newSong(Model model) {
        model.addAttribute("form", new SongForm());
        model.addAttribute("activeTab", "songs");
        return "song-form";
    }

    @PostMapping("/songs")
    public String createSong(@Valid @ModelAttribute("form") SongForm form, BindingResult result,
                             Model model, RedirectAttributes redirect) {
        if (result.hasErrors()) {
            model.addAttribute("activeTab", "songs");
            return "song-form";
        }
        music.saveSong(new Song(form.getTitle().trim(), form.getArtist().trim(), form.getGenre().trim(),
                form.getReleaseYear(), clean(form.getMoodNote())));
        redirect.addFlashAttribute("notice", "Lagu berhasil ditambahkan.");
        return "redirect:/songs";
    }

    @GetMapping("/songs/{id}/edit")
    public String editSong(@PathVariable long id, Model model) {
        model.addAttribute("form", new SongForm(music.song(id)));
        model.addAttribute("songId", id);
        model.addAttribute("activeTab", "songs");
        return "song-form";
    }

    @PostMapping("/songs/{id}")
    public String updateSong(@PathVariable long id, @Valid @ModelAttribute("form") SongForm form,
                             BindingResult result, Model model, RedirectAttributes redirect) {
        if (result.hasErrors()) {
            model.addAttribute("songId", id);
            model.addAttribute("activeTab", "songs");
            return "song-form";
        }
        Song song = music.song(id);
        song.update(form.getTitle().trim(), form.getArtist().trim(), form.getGenre().trim(),
                form.getReleaseYear(), clean(form.getMoodNote()));
        music.saveSong(song);
        redirect.addFlashAttribute("notice", "Data lagu berhasil diperbarui.");
        return "redirect:/songs";
    }

    @PostMapping("/songs/{id}/delete")
    public String deleteSong(@PathVariable long id, RedirectAttributes redirect) {
        music.deleteSong(id);
        redirect.addFlashAttribute("notice", "Lagu berhasil dihapus.");
        return "redirect:/songs";
    }

    @GetMapping("/playlists")
    public String playlists(Model model) {
        model.addAttribute("playlists", music.playlists());
        model.addAttribute("activeTab", "playlists");
        return "playlists";
    }

    @GetMapping("/playlists/new")
    public String newPlaylist(Model model) {
        model.addAttribute("form", new PlaylistForm());
        model.addAttribute("activeTab", "playlists");
        return "playlist-form";
    }

    @PostMapping("/playlists")
    public String createPlaylist(@Valid @ModelAttribute("form") PlaylistForm form, BindingResult result,
                                 Model model, RedirectAttributes redirect) {
        if (result.hasErrors()) {
            model.addAttribute("activeTab", "playlists");
            return "playlist-form";
        }
        music.savePlaylist(new Playlist(form.getName().trim(), clean(form.getDescription()),
                clean(form.getMoodTag()), Playlist.validCover(form.getCoverVariant())));
        redirect.addFlashAttribute("notice", "Playlist berhasil dibuat.");
        return "redirect:/playlists";
    }

    @GetMapping("/playlists/{id}")
    public String playlistDetail(@PathVariable long id, Model model) {
        model.addAttribute("playlist", music.playlist(id));
        model.addAttribute("songs", music.songs());
        model.addAttribute("activeTab", "playlists");
        return "playlist-detail";
    }

    @GetMapping("/playlists/{id}/edit")
    public String editPlaylist(@PathVariable long id, Model model) {
        model.addAttribute("form", new PlaylistForm(music.playlist(id)));
        model.addAttribute("playlistId", id);
        model.addAttribute("activeTab", "playlists");
        return "playlist-form";
    }

    @PostMapping("/playlists/{id}")
    public String updatePlaylist(@PathVariable long id, @Valid @ModelAttribute("form") PlaylistForm form,
                                 BindingResult result, Model model, RedirectAttributes redirect) {
        if (result.hasErrors()) {
            model.addAttribute("playlistId", id);
            model.addAttribute("activeTab", "playlists");
            return "playlist-form";
        }
        Playlist playlist = music.playlist(id);
        playlist.update(form.getName().trim(), clean(form.getDescription()), clean(form.getMoodTag()),
                Playlist.validCover(form.getCoverVariant()));
        music.savePlaylist(playlist);
        redirect.addFlashAttribute("notice", "Playlist berhasil diperbarui.");
        return "redirect:/playlists/" + id;
    }

    @PostMapping("/playlists/{id}/delete")
    public String deletePlaylist(@PathVariable long id, RedirectAttributes redirect) {
        music.deletePlaylist(id);
        redirect.addFlashAttribute("notice", "Playlist berhasil dihapus.");
        return "redirect:/playlists";
    }

    @PostMapping("/playlists/{id}/tracks")
    public String addTrack(@PathVariable long id, @RequestParam long songId, RedirectAttributes redirect) {
        music.addSong(id, songId);
        redirect.addFlashAttribute("notice", "Lagu ditambahkan ke playlist.");
        return "redirect:/playlists/" + id;
    }

    @PostMapping("/playlists/{id}/tracks/{songId}/remove")
    public String removeTrack(@PathVariable long id, @PathVariable long songId, RedirectAttributes redirect) {
        music.removeSong(id, songId);
        redirect.addFlashAttribute("notice", "Lagu dihapus dari playlist.");
        return "redirect:/playlists/" + id;
    }

    @PostMapping("/playlists/{id}/tracks/{songId}/move/{direction}")
    public String moveTrack(@PathVariable long id, @PathVariable long songId,
                            @PathVariable String direction, RedirectAttributes redirect) {
        if (!"up".equals(direction) && !"down".equals(direction)) {
            throw new IllegalArgumentException("Arah pemindahan tidak valid.");
        }
        music.moveSong(id, songId, "up".equals(direction) ? -1 : 1);
        return "redirect:/playlists/" + id;
    }

    @GetMapping("/journal")
    public String journal(Model model) {
        model.addAttribute("journals", music.journals());
        model.addAttribute("activeTab", "journal");
        return "journal";
    }

    @GetMapping("/journal/new")
    public String newJournal(Model model) {
        addJournalFormOptions(model);
        model.addAttribute("form", new JournalForm());
        model.addAttribute("activeTab", "journal");
        return "journal-form";
    }

    @PostMapping("/journal")
    public String createJournal(@Valid @ModelAttribute("form") JournalForm form, BindingResult result,
                                Model model, RedirectAttributes redirect) {
        if (result.hasErrors()) {
            addJournalFormOptions(model);
            model.addAttribute("activeTab", "journal");
            return "journal-form";
        }
        music.saveJournal(new MoodJournal(form.getMoodLabel().trim(), form.getEnergyLevel(), form.getNote().trim(),
                linkedSong(form.getLinkedSongId()), form.getEntryDate()));
        redirect.addFlashAttribute("notice", "Jurnal mood berhasil disimpan.");
        return "redirect:/journal";
    }

    @GetMapping("/journal/{id}/edit")
    public String editJournal(@PathVariable long id, Model model) {
        addJournalFormOptions(model);
        model.addAttribute("form", new JournalForm(music.journal(id)));
        model.addAttribute("journalId", id);
        model.addAttribute("activeTab", "journal");
        return "journal-form";
    }

    @PostMapping("/journal/{id}")
    public String updateJournal(@PathVariable long id, @Valid @ModelAttribute("form") JournalForm form,
                                BindingResult result, Model model, RedirectAttributes redirect) {
        if (result.hasErrors()) {
            addJournalFormOptions(model);
            model.addAttribute("journalId", id);
            model.addAttribute("activeTab", "journal");
            return "journal-form";
        }
        MoodJournal journal = music.journal(id);
        journal.update(form.getMoodLabel().trim(), form.getEnergyLevel(), form.getNote().trim(),
                linkedSong(form.getLinkedSongId()), form.getEntryDate());
        music.saveJournal(journal);
        redirect.addFlashAttribute("notice", "Jurnal mood berhasil diperbarui.");
        return "redirect:/journal";
    }

    @PostMapping("/journal/{id}/delete")
    public String deleteJournal(@PathVariable long id, RedirectAttributes redirect) {
        music.deleteJournal(id);
        redirect.addFlashAttribute("notice", "Entri jurnal berhasil dihapus.");
        return "redirect:/journal";
    }

    @GetMapping("/insights")
    public String insights(Model model) {
        model.addAttribute("insights", music.insights());
        model.addAttribute("activeTab", "insights");
        return "insights";
    }

    @GetMapping("/ai")
    public String aiPage(Model model) {
        model.addAttribute("activeTab", "ai");
        model.addAttribute("mode", "recommend");
        model.addAttribute("prompt", "");
        return "ai";
    }

    @PostMapping("/ai")
    public String askAi(@RequestParam String mode, @RequestParam String prompt, Model model) {
        model.addAttribute("activeTab", "ai");
        model.addAttribute("mode", mode);
        model.addAttribute("prompt", prompt);
        if (!List.of("recommend", "playlist", "theme").contains(mode)) {
            model.addAttribute("error", "Mode AI tidak dikenal.");
            return "ai";
        }
        if (prompt.isBlank()) {
            model.addAttribute("error", "Tulis permintaan atau suasana hati terlebih dahulu.");
            return "ai";
        }
        if ("playlist".equals(mode)) {
            try {
                GeneratedPlaylistDraft draft = gemini.generatePlaylistDraft(prompt.trim(), 6, music.songs());
                model.addAttribute("generatedDraft", draft);
                model.addAttribute("draft", draft);
            } catch (IllegalStateException exception) {
                model.addAttribute("error", exception.getMessage());
            } catch (RestClientException exception) {
                model.addAttribute("error", geminiError(exception));
            }
            return "ai";
        }
        try {
            model.addAttribute("answer", gemini.answer("recommend", prompt.trim(), music.songs()));
        } catch (IllegalStateException exception) {
            model.addAttribute("error", exception.getMessage());
        } catch (RestClientException exception) {
            model.addAttribute("error", geminiError(exception));
        }
        return "ai";
    }

    @PostMapping("/ai/save")
    public String saveGeneratedPlaylist(
            @SessionAttribute(name = "generatedDraft", required = false) GeneratedPlaylistDraft draft,
            SessionStatus sessionStatus, RedirectAttributes redirect) {
        if (draft == null || draft.tracks() == null || draft.tracks().isEmpty()) {
            throw new IllegalArgumentException("Rancangan playlist tidak tersedia atau sudah kedaluwarsa.");
        }
        Playlist saved = music.saveGeneratedPlaylist(draft);
        sessionStatus.setComplete();
        redirect.addFlashAttribute("notice", "Playlist hasil kurasi AI berhasil disimpan.");
        return "redirect:/playlists/" + saved.getId();
    }

    @PostMapping("/ai/soundscape")
    public String composeSoundscape(@RequestParam String prompt, Model model) {
        model.addAttribute("activeTab", "ai");
        model.addAttribute("mode", "recommend");
        model.addAttribute("prompt", "");
        if (prompt.isBlank()) {
            model.addAttribute("soundscapeError", "Masukkan suasana hati untuk membuat soundscape.");
            return "ai";
        }
        try {
            SoundscapeBlueprint blueprint = gemini.composeSoundscape(prompt.trim());
            model.addAttribute("soundscapeBlueprint", blueprint);
            model.addAttribute("soundscapeJson", objectMapper.writeValueAsString(blueprint));
        } catch (IllegalStateException exception) {
            model.addAttribute("soundscapeError", exception.getMessage());
        } catch (RestClientException exception) {
            model.addAttribute("soundscapeError", geminiError(exception));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Gagal menyiapkan soundscape untuk pemutar.", exception);
        }
        return "ai";
    }

    @GetMapping("/theme")
    public String themePage(Model model) {
        model.addAttribute("activeTab", "theme");
        model.addAttribute("mode", "theme");
        model.addAttribute("prompt", "");
        return "theme";
    }

    @GetMapping("/audio")
    public String audioPage(@RequestParam(required = false) String title,
                            @RequestParam(required = false) String artist, Model model) {
        model.addAttribute("activeTab", "audio");
        model.addAttribute("songs", music.songs());
        model.addAttribute("title", title);
        model.addAttribute("artist", artist);
        if (title != null && !title.isBlank()) {
            try {
                model.addAttribute("preview", audio.findPreview(title.trim(), artist == null ? "" : artist.trim()));
            } catch (org.springframework.web.client.RestClientException exception) {
                model.addAttribute("previewError",
                        "Pratinjau audio tidak dapat dimuat. Pemutar YouTube tetap bisa digunakan.");
            }
            String artistName = artist == null ? "" : artist.trim();
            try {
                model.addAttribute("videos", audio.findVideos(title.trim(), artistName));
            } catch (org.springframework.web.client.RestClientException exception) {
                model.addAttribute("videos", new AudioLookupService.VideoSearch(List.of(),
                        "Pencarian video gagal dimuat. Periksa koneksi internet lalu coba lagi."));
            }
        }
        return "audio";
    }

    @PostMapping("/theme")
    public String explainTheme(@RequestParam String title, @RequestParam String artist,
                               @RequestParam(required = false) String genre, Model model) {
        String prompt = "Jelaskan tema lagu \"" + title.trim() + "\" oleh " + artist.trim()
                + (genre == null || genre.isBlank() ? "" : " dengan genre " + genre.trim()) + ".";
        model.addAttribute("activeTab", "theme");
        model.addAttribute("title", title);
        model.addAttribute("artist", artist);
        model.addAttribute("genre", genre);
        if (title.isBlank() || artist.isBlank()) {
            model.addAttribute("error", "Judul lagu dan nama artis wajib diisi.");
        } else {
            try {
                model.addAttribute("answer", gemini.answer("theme", prompt, music.songs()));
            } catch (IllegalStateException exception) {
                model.addAttribute("error", exception.getMessage());
            } catch (RestClientException exception) {
                model.addAttribute("error", geminiError(exception));
            }
        }
        return "theme";
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public String notFound(EntityNotFoundException exception, Model model) {
        model.addAttribute("message", exception.getMessage());
        model.addAttribute("activeTab", "");
        return "not-found";
    }

    private Song linkedSong(Long id) {
        return id == null ? null : songs.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lagu yang ditautkan tidak ditemukan."));
    }

    static String geminiError(RestClientException exception) {
        if (exception instanceof RestClientResponseException responseException) {
            int status = responseException.getStatusCode().value();
            return switch (status) {
                case 400 -> "Gemini menolak permintaan (HTTP 400). Periksa isi permintaan dan nama model.";
                case 401 -> "API key Gemini tidak valid atau tidak diotorisasi (HTTP 401).";
                case 403 -> "Akses Gemini ditolak (HTTP 403). Periksa izin API dan pembatasan pada key.";
                case 404 -> "Model Gemini tidak ditemukan (HTTP 404). Periksa pengaturan GEMINI_MODEL.";
                case 429 -> "Kuota atau batas permintaan Gemini tercapai (HTTP 429).";
                default -> "Gemini mengembalikan error HTTP " + status + ". Periksa izin API dan kuota.";
            };
        }
        return "Gemini tidak dapat dihubungi. Periksa koneksi internet dan coba lagi.";
    }

    private void addJournalFormOptions(Model model) {
        model.addAttribute("songs", music.songs());
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
