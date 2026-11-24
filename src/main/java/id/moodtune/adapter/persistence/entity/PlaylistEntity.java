package id.moodtune.adapter.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "moodtune_playlists")
public class PlaylistEntity {
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
    private List<PlaylistTrackEntity> tracks = new ArrayList<>();

    protected PlaylistEntity() {
    }

    public static PlaylistEntity create() {
        return new PlaylistEntity();
    }

    public void update(String name, String description, String moodTag, String coverVariant) {
        this.name = name;
        this.description = description;
        this.moodTag = moodTag;
        this.coverVariant = "rain".equals(coverVariant) || "morning".equals(coverVariant) ? coverVariant : "focus";
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
    public List<PlaylistTrackEntity> getTracks() { return tracks; }
}
