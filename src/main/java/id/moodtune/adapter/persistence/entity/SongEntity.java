package id.moodtune.adapter.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "moodtune_songs")
public class SongEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 160)
    @Column(nullable = false)
    private String title;

    @NotBlank
    @Size(max = 160)
    @Column(nullable = false)
    private String artist;

    @NotBlank
    @Size(max = 80)
    @Column(nullable = false)
    private String genre;

    @NotNull
    @Min(1900)
    @Max(2030)
    @Column(name = "release_year", nullable = false)
    private Integer releaseYear;

    @Size(max = 500)
    @Column(name = "mood_note")
    private String moodNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "song")
    private List<PlaylistTrackEntity> playlistLinks = new ArrayList<>();

    protected SongEntity() {
    }

    public static SongEntity create() {
        return new SongEntity();
    }

    public void update(String title, String artist, String genre, Integer releaseYear, String moodNote) {
        this.title = title;
        this.artist = artist;
        this.genre = genre;
        this.releaseYear = releaseYear;
        this.moodNote = moodNote;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getArtist() { return artist; }
    public String getGenre() { return genre; }
    public Integer getReleaseYear() { return releaseYear; }
    public String getMoodNote() { return moodNote; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<PlaylistTrackEntity> getPlaylistLinks() { return playlistLinks; }
}
