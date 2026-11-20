package id.moodtune.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

class GeminiServiceTest {
    private static final String ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent?key=test-key";

    @Test
    void recommendationPromptRequestsMostlyNewAndVariedSongs() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiService service = new GeminiService(builder, new ObjectMapper(), "test-key", "gemini-test");
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(POST))
                .andExpect(jsonPath("$.contents[0].parts[0].text", allOf(
                        containsString("tepat 8 rekomendasi lagu nyata"),
                        containsString("paling banyak 2"),
                        containsString("setidaknya 6 lagu baru"),
                        containsString("variasikan genre"),
                        containsString("lagu galau"))))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(768))
                .andRespond(withSuccess(geminiTextResponse("Eight varied songs"), MediaType.APPLICATION_JSON));

        assertEquals("Eight varied songs", service.answer("recommend", "lagu galau", List.of()));
        server.verify();
    }

    @Test
    void generatedPlaylistPromptIncludesNewSongsInsteadOfOnlyLibraryTracks() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiService service = new GeminiService(builder, new ObjectMapper(), "test-key", "gemini-test");
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(POST))
                .andExpect(jsonPath("$.contents[0].parts[0].text", allOf(
                        containsString("paling banyak 2 lagu koleksi"),
                        containsString("setidaknya 4 lagu baru"),
                        containsString("Koleksi lagu pengguna masih kosong"))))
                .andRespond(withSuccess(geminiTextResponse("""
                        {"name":"Malam Galau","description":"Lagu baru","moodTag":"galau","coverVariant":"rain","tracks":[
                          {"source":"new","title":"Song One","artist":"Artist One","genre":"Pop","releaseYear":2020},
                          {"source":"new","title":"Song Two","artist":"Artist Two","genre":"Rock","releaseYear":2021},
                          {"source":"new","title":"Song Three","artist":"Artist Three","genre":"Indie","releaseYear":2022},
                          {"source":"new","title":"Song Four","artist":"Artist Four","genre":"Pop","releaseYear":2023},
                          {"source":"new","title":"Song Five","artist":"Artist Five","genre":"Jazz","releaseYear":2024},
                          {"source":"new","title":"Song Six","artist":"Artist Six","genre":"Folk","releaseYear":2025}
                        ]}
                        """), MediaType.APPLICATION_JSON));

        GeneratedPlaylistDraft draft = service.generatePlaylistDraft("lagu galau", 6, List.of());

        assertEquals(6, draft.tracks().size());
        assertEquals(6, draft.tracks().stream().filter(track -> "new".equals(track.source())).count());
        server.verify();
    }

    private String geminiTextResponse(String text) {
        try {
            return new ObjectMapper().writeValueAsString(java.util.Map.of(
                    "candidates", List.of(java.util.Map.of(
                            "content", java.util.Map.of(
                                    "parts", List.of(java.util.Map.of("text", text)))))));
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
