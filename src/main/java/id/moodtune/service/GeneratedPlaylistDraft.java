package id.moodtune.service;

import java.util.List;

public record GeneratedPlaylistDraft(
        String name,
        String description,
        String moodTag,
        String coverVariant,
        List<Track> tracks
) {
    public record Track(
            String source,
            Long songId,
            String title,
            String artist,
            String genre,
            Integer releaseYear,
            String reason
    ) {
    }
}
