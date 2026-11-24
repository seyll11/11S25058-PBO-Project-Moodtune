package id.moodtune.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import id.moodtune.usecase.port.AudioSearchPort.Video;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AudioLookupServiceTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parsesYouTubeSearchResultsForEmbeddedPlayback() throws Exception {
        String html = """
                <script>var ytInitialData = {"contents":{"videoRenderer":{
                  "videoId":"dQw4w9WgXcQ",
                  "title":{"runs":[{"text":"Example song"}]},
                  "ownerText":{"runs":[{"text":"Example artist"}]}
                }}};</script>
                """;

        List<Video> videos = AudioLookupService.parsePublicVideos(html, objectMapper);

        assertEquals(1, videos.size());
        assertEquals("dQw4w9WgXcQ", videos.get(0).videoId());
        assertEquals("Example song", videos.get(0).title());
        assertEquals("Example artist", videos.get(0).channel());
    }

    @Test
    void surfacesMalformedYouTubeSearchJson() {
        assertThrows(com.fasterxml.jackson.core.JsonProcessingException.class,
                () -> AudioLookupService.parsePublicVideos(
                        "<script>var ytInitialData = {invalid};</script>", objectMapper));
    }

    @Test
    void ignoresInvalidYouTubeVideoIds() throws Exception {
        assertEquals(List.of(), AudioLookupService.parsePublicVideos(
                "<script>var ytInitialData = {\"videoRenderer\":{\"videoId\":\"short\"}};</script>",
                objectMapper));
    }
}
