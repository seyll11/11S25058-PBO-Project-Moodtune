package id.moodtune.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MoodTuneControllerTest {
    @Test
    void reportsGeminiAuthorizationQuotaAndModelErrorsWithoutLeakingResponseBody() {
        assertEquals("API key Gemini tidak valid atau tidak diotorisasi (HTTP 401).",
                MoodTuneController.geminiError(responseError(HttpStatus.UNAUTHORIZED)));
        assertEquals("Akses Gemini ditolak (HTTP 403). Periksa izin API dan pembatasan pada key.",
                MoodTuneController.geminiError(responseError(HttpStatus.FORBIDDEN)));
        assertEquals("Model Gemini tidak ditemukan (HTTP 404). Periksa pengaturan GEMINI_MODEL.",
                MoodTuneController.geminiError(responseError(HttpStatus.NOT_FOUND)));
        assertEquals("Kuota atau batas permintaan Gemini tercapai (HTTP 429).",
                MoodTuneController.geminiError(responseError(HttpStatus.TOO_MANY_REQUESTS)));
    }

    @Test
    void reportsNetworkErrorsWithoutProviderDetails() {
        assertEquals("Gemini tidak dapat dihubungi. Periksa koneksi internet dan coba lagi.",
                MoodTuneController.geminiError(new RestClientException("connection failed")));
    }

    private RestClientResponseException responseError(HttpStatus status) {
        return new RestClientResponseException("provider error", status, status.getReasonPhrase(),
                HttpHeaders.EMPTY, "sensitive provider body".getBytes(), null);
    }
}
