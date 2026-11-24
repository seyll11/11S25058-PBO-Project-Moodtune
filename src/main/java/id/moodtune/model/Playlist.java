package id.moodtune.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Playlist {
    private final Long id;
    private String name;
    private String description;
    private String moodTag;
    private String coverVariant;
    private final LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private final List<PlaylistTrack> tracks;

    public Playlist(String name, String description, String moodTag, String coverVariant) {
        this(null, name, description, moodTag, validCover(coverVariant), LocalDateTime.now(),
                LocalDateTime.now(), List.of());
    }

    public Playlist(Long id, String name, String description, String moodTag, String coverVariant,
                    LocalDateTime createdAt, LocalDateTime updatedAt, List<PlaylistTrack> tracks) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.moodTag = moodTag;
        this.coverVariant = validCover(coverVariant);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.tracks = new ArrayList<>(tracks);
    }

    public static String validCover(String value) {
        return "rain".equals(value) || "morning".equals(value) ? value : "focus";
    }

    public void update(String name, String description, String moodTag, String coverVariant) {
        this.name = name;
        this.description = description;
        this.moodTag = moodTag;
        this.coverVariant = validCover(coverVariant);
        this.updatedAt = LocalDateTime.now();
    }

    public void touch() { this.updatedAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getMoodTag() { return moodTag; }
    public String getCoverVariant() { return coverVariant; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<PlaylistTrack> getTracks() { return tracks; }
}
