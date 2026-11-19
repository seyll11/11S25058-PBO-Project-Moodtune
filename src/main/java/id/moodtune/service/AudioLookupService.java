package id.moodtune.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class AudioLookupService {
    public record Preview(boolean found, String previewUrl, String trackName, String artistName,
                          String collectionName, String trackViewUrl, String message) {}
    public record Video(String videoId, String title, String channel, String watchUrl) {}
    public record VideoSearch(List<Video> videos, String searchUrl, String message) {}

    private final RestClient restClient;
    private final String youtubeApiKey;

    public AudioLookupService(RestClient.Builder builder,
                              @Value("${moodtune.youtube.api-key:}") String youtubeApiKey) {
        this.restClient = builder.build();
        this.youtubeApiKey = youtubeApiKey;
    }

    public Preview findPreview(String title, String artist) {
        JsonNode response = restClient.get()
                .uri(uri -> uri.scheme("https").host("itunes.apple.com").path("/search")
                        .queryParam("term", (title + " " + artist).trim())
                        .queryParam("media", "music").queryParam("entity", "song")
                        .queryParam("limit", 6).build())
                .retrieve().body(JsonNode.class);
        List<JsonNode> candidates = new ArrayList<>();
        JsonNode results = response == null ? null : response.path("results");
        if (results != null && results.isArray()) {
            results.forEach(item -> {
                if (!item.path("previewUrl").asText("").isBlank()) candidates.add(item);
            });
        }
        String titleLower = title.toLowerCase();
        String artistLower = artist.toLowerCase();
        JsonNode best = candidates.stream()
                .max(Comparator.comparingInt(item -> score(item, titleLower, artistLower)))
                .orElse(null);
        if (best == null) {
            return new Preview(false, null, null, null, null, null,
                    "Cuplikan audio belum tersedia untuk lagu ini.");
        }
        return new Preview(true, best.path("previewUrl").asText(),
                best.path("trackName").asText(title), best.path("artistName").asText(artist),
                best.path("collectionName").asText(""), best.path("trackViewUrl").asText(""), null);
    }

    public VideoSearch findVideos(String title, String artist) {
        String searchTerm = (title + " " + artist + " official audio").trim();
        String searchUrl = "https://www.youtube.com/results?search_query="
                + URLEncoder.encode(searchTerm, StandardCharsets.UTF_8);
        if (youtubeApiKey == null || youtubeApiKey.isBlank()) {
            return new VideoSearch(List.of(), searchUrl,
                    "Atur YOUTUBE_API_KEY untuk menampilkan hasil video langsung. Kamu tetap dapat mencari di YouTube.");
        }
        JsonNode response = restClient.get()
                .uri(uri -> uri.scheme("https").host("www.googleapis.com").path("/youtube/v3/search")
                        .queryParam("part", "snippet").queryParam("type", "video")
                        .queryParam("videoEmbeddable", true).queryParam("videoCategoryId", "10")
                        .queryParam("maxResults", 5).queryParam("q", searchTerm)
                        .queryParam("key", youtubeApiKey).build())
                .retrieve().body(JsonNode.class);
        List<Video> videos = new ArrayList<>();
        JsonNode items = response == null ? null : response.path("items");
        if (items != null && items.isArray()) {
            items.forEach(item -> {
                String videoId = item.path("id").path("videoId").asText("");
                if (!videoId.isBlank()) {
                    videos.add(new Video(videoId, item.path("snippet").path("title").asText("YouTube"),
                            item.path("snippet").path("channelTitle").asText("YouTube"),
                            "https://www.youtube.com/watch?v=" + videoId));
                }
            });
        }
        return new VideoSearch(videos, searchUrl,
                videos.isEmpty() ? "Video untuk lagu ini tidak ditemukan." : null);
    }

    private int score(JsonNode item, String title, String artist) {
        String track = item.path("trackName").asText("").toLowerCase();
        String performer = item.path("artistName").asText("").toLowerCase();
        int score = track.contains(title) ? 2 : 0;
        if (!artist.isBlank() && performer.contains(artist)) score++;
        return score;
    }
}
