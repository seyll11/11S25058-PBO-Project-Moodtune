package id.moodtune.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AudioLookupService {
    public record Preview(boolean found, String previewUrl, String trackName, String artistName,
                          String collectionName, String trackViewUrl, String message) {}
    public record Video(String videoId, String title, String channel) {}
    public record VideoSearch(List<Video> videos, String message) {}

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            + "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    private static final Pattern INITIAL_DATA = Pattern.compile(
            "var ytInitialData\\s*=\\s*(\\{.*?});</script>", Pattern.DOTALL);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String youtubeApiKey;

    public AudioLookupService(RestClient.Builder builder,
                              ObjectMapper objectMapper,
                              @Value("${moodtune.youtube.api-key:}") String youtubeApiKey) {
        this.restClient = builder.build();
        this.objectMapper = objectMapper;
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
        try {
            List<Video> videos;
            if (youtubeApiKey == null || youtubeApiKey.isBlank()) {
                videos = searchPublicYouTube(searchTerm);
            } else {
                try {
                    videos = searchYouTubeDataApi(searchTerm);
                } catch (org.springframework.web.client.RestClientException exception) {
                    videos = searchPublicYouTube(searchTerm);
                }
                if (videos.isEmpty()) videos = searchPublicYouTube(searchTerm);
            }
            return new VideoSearch(videos,
                    videos.isEmpty() ? "Video tidak tersedia untuk diputar saat ini. Coba lagi nanti." : null);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            return new VideoSearch(List.of(),
                    "Hasil pencarian video tidak dapat dibaca. Coba lagi nanti.");
        }
    }

    private List<Video> searchYouTubeDataApi(String searchTerm) {
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
                if (isValidVideoId(videoId)) {
                    videos.add(new Video(videoId, item.path("snippet").path("title").asText("YouTube"),
                            item.path("snippet").path("channelTitle").asText("YouTube")));
                }
            });
        }
        return videos;
    }

    private List<Video> searchPublicYouTube(String searchTerm)
            throws com.fasterxml.jackson.core.JsonProcessingException {
        String html = restClient.get()
                .uri(uri -> uri.scheme("https").host("www.youtube.com").path("/results")
                        .queryParam("search_query", searchTerm).build())
                .header(HttpHeaders.USER_AGENT, USER_AGENT)
                .header(HttpHeaders.ACCEPT_LANGUAGE, "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7")
                .retrieve().body(String.class);
        return parsePublicVideos(html, objectMapper);
    }

    static List<Video> parsePublicVideos(String html, ObjectMapper objectMapper)
            throws com.fasterxml.jackson.core.JsonProcessingException {
        if (html == null) return List.of();
        Matcher matcher = INITIAL_DATA.matcher(html);
        if (!matcher.find()) return List.of();
        JsonNode data = objectMapper.readTree(matcher.group(1));
        List<Video> videos = new ArrayList<>();
        collectVideos(data, videos, new HashSet<>());
        return List.copyOf(videos);
    }

    private static void collectVideos(JsonNode node, List<Video> videos, Set<String> seen) {
        if (node == null || node.isNull() || videos.size() >= 5) return;
        if (node.isArray()) {
            node.forEach(child -> collectVideos(child, videos, seen));
            return;
        }
        if (!node.isObject()) return;

        JsonNode renderer = node.path("videoRenderer");
        String videoId = renderer.path("videoId").asText("");
        if (!videoId.isBlank() && isValidVideoId(videoId) && seen.add(videoId)) {
            String title = textFromRuns(renderer.path("title"));
            String channel = textFromRuns(renderer.path("ownerText"));
            if (channel.isBlank()) channel = textFromRuns(renderer.path("longBylineText"));
            videos.add(new Video(videoId, title.isBlank() ? "YouTube" : title,
                    channel.isBlank() ? "YouTube" : channel));
            return;
        }
        node.elements().forEachRemaining(child -> collectVideos(child, videos, seen));
    }

    private static String textFromRuns(JsonNode node) {
        if (node.hasNonNull("simpleText")) return node.path("simpleText").asText();
        JsonNode runs = node.path("runs");
        if (!runs.isArray()) return "";
        StringBuilder text = new StringBuilder();
        runs.forEach(run -> text.append(run.path("text").asText("")));
        return text.toString();
    }

    private static boolean isValidVideoId(String videoId) {
        return videoId != null && videoId.matches("[A-Za-z0-9_-]{11}");
    }

    private int score(JsonNode item, String title, String artist) {
        String track = item.path("trackName").asText("").toLowerCase();
        String performer = item.path("artistName").asText("").toLowerCase();
        int score = track.contains(title) ? 2 : 0;
        if (!artist.isBlank() && performer.contains(artist)) score++;
        return score;
    }
}
