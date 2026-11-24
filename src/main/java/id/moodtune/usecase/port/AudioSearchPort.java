package id.moodtune.usecase.port;

import java.util.List;

public interface AudioSearchPort {
    Preview findPreview(String title, String artist);
    VideoSearch findVideos(String title, String artist);

    record Preview(boolean found, String previewUrl, String trackName, String artistName,
                   String collectionName, String trackViewUrl, String message) {
    }

    record Video(String videoId, String title, String channel) {
    }

    record VideoSearch(List<Video> videos, String message) {
    }
}
