package id.moodtune.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "moodtune_songs")
public class Song {
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
    private List<PlaylistTrack> playlistLinks = new ArrayList<>();

    protected Song() {
    }

    public Song(String title, String artist, String genre, Integer releaseYear, String moodNote) {
        this.title = title;
        this.artist = artist;
        this.genre = genre;
        this.releaseYear = releaseYear;
        this.moodNote = moodNote;
    }

    @PrePersist
    void setCreatedAt() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getArtist() { return artist; }
    public String getGenre() { return genre; }
    public Integer getReleaseYear() { return releaseYear; }
    public String getMoodNote() { return moodNote; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<PlaylistTrack> getPlaylistLinks() { return playlistLinks; }

    public void update(String title, String artist, String genre, Integer releaseYear, String moodNote) {
        this.title = title;
        this.artist = artist;
        this.genre = genre;
        this.releaseYear = releaseYear;
        this.moodNote = moodNote;
    }
}
