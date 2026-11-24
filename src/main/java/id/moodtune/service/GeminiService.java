package id.moodtune.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import id.moodtune.model.Playlist;
import id.moodtune.model.Song;
import id.moodtune.usecase.dto.GeneratedPlaylistDraft;
import id.moodtune.usecase.dto.SoundscapeBlueprint;
import id.moodtune.usecase.port.MusicAiPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService implements MusicAiPort {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public GeminiService(RestClient.Builder builder, ObjectMapper objectMapper,
                         @Value("${moodtune.gemini.api-key:}") String apiKey,
                         @Value("${moodtune.gemini.model:gemini-3.5-flash-lite}") String model) {
        this.restClient = builder.baseUrl("https://generativelanguage.googleapis.com").build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String answer(String mode, String prompt, List<Song> songs) {
        String context = libraryContext(songs);
        String instruction = switch (mode) {
            case "theme" -> "Jelaskan tema, suasana emosional, motif, dan konteks mendengarkan lagu/permintaan pengguna. Hindari mengutip lirik.";
            default -> "Bertindaklah sebagai kurator musik dan buat tepat 8 rekomendasi lagu nyata yang sesuai dengan suasana/permintaan. "
                    + "Jangan membatasi rekomendasi pada koleksi pengguna: jika ada lagu koleksi yang relevan, pilih paling banyak 2; "
                    + "pilih setidaknya 6 lagu baru yang belum ada di koleksi. Jika koleksi kosong atau tidak ada lagu yang cocok, "
                    + "rekomendasikan 8 lagu baru. Jangan mengulang lagu atau artis; variasikan genre, era, dan negara sesuai konteks "
                    + "(ikuti permintaan jika pengguna menentukan genre atau wilayah tertentu). Jangan mengarang judul atau artis. "
                    + "Untuk setiap lagu tulis judul — artis, tandai 'Dari koleksi' atau 'Lagu baru', lalu beri satu alasan singkat.";
        };
        return generate(instruction + "\n\nKonteks koleksi:\n" + context
                + "\n\nPermintaan pengguna:\n" + prompt, false, "recommend".equals(mode) ? 768 : 512);
    }

    @Override
    public GeneratedPlaylistDraft generatePlaylistDraft(String prompt, int requestedCount, List<Song> songs) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Fitur AI belum aktif. Atur GEMINI_API_KEY sebelum menjalankan aplikasi.");
        }
        int count = Math.max(4, Math.min(12, requestedCount));
        String promptText = "Anda adalah kurator playlist MoodTune. Jawab hanya JSON valid dalam Bahasa Indonesia. "
                + "Buat playlist berisi tepat " + count + " lagu yang nyata dan cocok untuk tema: " + prompt + ". "
                + "Jangan membatasi playlist pada koleksi: gunakan paling banyak 2 lagu koleksi yang benar-benar cocok "
                + "dan isi setidaknya " + Math.max(0, count - 2) + " lagu baru yang nyata dan belum ada di koleksi. "
                + "Jika tidak ada lagu koleksi yang cocok, isi semuanya dengan lagu baru. Hindari lagu/artis berulang "
                + "dan variasikan genre atau era sesuai tema. Jangan mengarang lagu. "
                + "Bentuk JSON: {\"name\":\"...\",\"description\":\"...\",\"moodTag\":\"...\","
                + "\"coverVariant\":\"focus|rain|morning\",\"tracks\":[{\"source\":\"library|new\","
                + "\"songId\":1,\"title\":\"...\",\"artist\":\"...\",\"genre\":\"...\","
                + "\"releaseYear\":2024,\"reason\":\"...\"}]}. "
                + "Koleksi pengguna: " + libraryContext(songs);
        String json = generate(promptText, true, 2048);
        GeneratedPlaylistDraft draft;
        try {
            draft = objectMapper.readValue(json, GeneratedPlaylistDraft.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Gemini mengirim rancangan playlist dengan format yang tidak valid.", exception);
        }
        if (draft == null || draft.name() == null || draft.name().isBlank()
                || draft.tracks() == null || draft.tracks().isEmpty()) {
            throw new IllegalStateException("Gemini tidak menghasilkan playlist yang berisi lagu.");
        }
        if (draft.name().length() > 160 || draft.description() != null && draft.description().length() > 1000
                || draft.moodTag() != null && draft.moodTag().length() > 80 || draft.tracks().size() > 12) {
            throw new IllegalStateException("Rancangan playlist Gemini melebihi batas data yang dapat disimpan.");
        }
        var libraryIds = songs.stream().map(Song::getId).collect(java.util.stream.Collectors.toSet());
        List<GeneratedPlaylistDraft.Track> tracks = draft.tracks().stream().map(track -> {
            if (track.title() == null || track.title().isBlank() || track.artist() == null || track.artist().isBlank()) {
                throw new IllegalStateException("Gemini menghasilkan lagu tanpa judul atau artis.");
            }
            if (track.title().length() > 160 || track.artist().length() > 160
                    || track.genre() != null && track.genre().length() > 80
                    || track.reason() != null && track.reason().length() > 500) {
                throw new IllegalStateException("Data lagu dalam rancangan playlist Gemini terlalu panjang.");
            }
            int releaseYear = track.releaseYear() == null ? 2020 : track.releaseYear();
            if (releaseYear < 1900 || releaseYear > 2030) releaseYear = 2020;
            boolean inLibrary = "library".equals(track.source()) && track.songId() != null
                    && libraryIds.contains(track.songId());
            return new GeneratedPlaylistDraft.Track(inLibrary ? "library" : "new",
                    inLibrary ? track.songId() : null, track.title().trim(), track.artist().trim(),
                    track.genre() == null || track.genre().isBlank() ? "Pop" : track.genre().trim(),
                    releaseYear,
                    track.reason() == null ? "" : track.reason().trim());
        }).toList();
        return new GeneratedPlaylistDraft(draft.name().trim(),
                draft.description() == null ? "" : draft.description().trim(),
                draft.moodTag() == null ? prompt : draft.moodTag().trim(),
                Playlist.validCover(draft.coverVariant()), tracks);
    }

    @Override
    public SoundscapeBlueprint composeSoundscape(String prompt) {
        String instruction = "Buat blueprint soundscape instrumental yang menenangkan untuk suasana: " + prompt
                + ". Jawab hanya JSON valid berbentuk {\"title\":\"...\",\"moodDescription\":\"...\","
                + "\"bpm\":76,\"waveform\":\"sine|triangle|warm-pad\",\"scaleName\":\"...\","
                + "\"chords\":[{\"name\":\"...\",\"frequencies\":[220,277,330],"
                + "\"melodyFrequencies\":[440,494,0,392]}]}. Gunakan 4 chord, "
                + "frekuensi fundamental 80-900 Hz dan nada melodi 100-1200 Hz.";
        String json = generate(instruction, true, 768);
        SoundscapeBlueprint blueprint;
        try {
            blueprint = objectMapper.readValue(json, SoundscapeBlueprint.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Gemini mengirim blueprint soundscape dengan format yang tidak valid.", exception);
        }
        if (blueprint == null || blueprint.title() == null || blueprint.title().isBlank()
                || blueprint.chords() == null || blueprint.chords().isEmpty() || blueprint.chords().size() > 8) {
            throw new IllegalStateException("Gemini tidak menghasilkan komposisi soundscape yang dapat diputar.");
        }
        List<SoundscapeBlueprint.Chord> chords = blueprint.chords().stream().map(chord -> {
            if (chord.frequencies() == null || chord.frequencies().isEmpty()) {
                throw new IllegalStateException("Blueprint soundscape memiliki chord tanpa frekuensi.");
            }
            List<Double> frequencies = bounded(chord.frequencies(), 35, 2000);
            if (frequencies.isEmpty()) throw new IllegalStateException("Frekuensi chord soundscape berada di luar rentang.");
            return new SoundscapeBlueprint.Chord(chord.name() == null ? "" : chord.name(), frequencies,
                    chord.melodyFrequencies() == null ? List.of() : bounded(chord.melodyFrequencies(), 60, 3000));
        }).toList();
        return new SoundscapeBlueprint(blueprint.title().trim(),
                blueprint.moodDescription() == null ? "" : blueprint.moodDescription().trim(),
                Math.max(54, Math.min(140, blueprint.bpm())),
                List.of("sine", "triangle", "warm-pad").contains(blueprint.waveform())
                        ? blueprint.waveform() : "sine",
                blueprint.scaleName() == null ? "" : blueprint.scaleName().trim(), chords);
    }

    private List<Double> bounded(List<Double> frequencies, double minimum, double maximum) {
        return frequencies.stream().filter(value -> value != null && Double.isFinite(value)
                && value >= minimum && value <= maximum).limit(8).toList();
    }

    private String libraryContext(List<Song> songs) {
        return songs.isEmpty() ? "Koleksi lagu pengguna masih kosong."
                : songs.stream().limit(80)
                .map(song -> "ID:" + song.getId() + " " + song.getTitle() + " — " + song.getArtist()
                        + " (" + song.getGenre() + ", " + song.getReleaseYear() + ")")
                .reduce((left, right) -> left + "; " + right).orElse("");
    }

    private String generate(String prompt, boolean json, int maxOutputTokens) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Fitur AI belum aktif. Atur GEMINI_API_KEY sebelum menjalankan aplikasi.");
        }
        Map<String, Object> generationConfig = json
                ? Map.of("responseMimeType", "application/json", "maxOutputTokens", maxOutputTokens)
                : Map.of("maxOutputTokens", maxOutputTokens);
        Map<String, Object> request = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text",
                        "Anda adalah kurator musik MoodTune. Jawab dalam Bahasa Indonesia.\n" + prompt)))),
                "generationConfig", generationConfig
        );
        Map<?, ?> response = restClient.post()
                .uri(uri -> uri.path("/v1beta/models/{model}:generateContent")
                        .queryParam("key", apiKey).build(model))
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(Map.class);
        return extractText(response);
    }

    private String extractText(Map<?, ?> response) {
        if (response == null) throw new IllegalStateException("Gemini tidak mengembalikan respons.");
        Object candidatesValue = response.get("candidates");
        if (!(candidatesValue instanceof List<?> candidates) || candidates.isEmpty()
                || !(candidates.get(0) instanceof Map<?, ?> candidate)
                || !(candidate.get("content") instanceof Map<?, ?> content)
                || !(content.get("parts") instanceof List<?> parts) || parts.isEmpty()
                || !(parts.get(0) instanceof Map<?, ?> part)
                || !(part.get("text") instanceof String text) || text.isBlank()) {
            throw new IllegalStateException("Respons Gemini tidak berisi jawaban yang dapat ditampilkan.");
        }
        return text;
    }

}
