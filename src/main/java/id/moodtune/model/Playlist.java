package id.moodtune.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "moodtune_playlists")
public class Playlist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 160)
    @Column(nullable = false)
    private String name;

    @Size(max = 1000)
    private String description;

    @Size(max = 80)
    @Column(name = "mood_tag")
    private String moodTag;

    @Column(name = "cover_variant", nullable = false)
    private String coverVariant = "focus";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "playlist", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC, id ASC")
    private List<PlaylistTrack> tracks = new ArrayList<>();

    protected Playlist() {
    }

    public Playlist(String name, String description, String moodTag, String coverVariant) {
        this.name = name;
        this.description = description;
        this.moodTag = moodTag;
        this.coverVariant = validCover(coverVariant);
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
