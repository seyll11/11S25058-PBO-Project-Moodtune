package id.moodtune.model;

import java.time.LocalDateTime;

public class Song {
    private final Long id;
    private String title;
    private String artist;
    private String genre;
    private Integer releaseYear;
    private String moodNote;
    private final LocalDateTime createdAt;

    public Song(String title, String artist, String genre, Integer releaseYear, String moodNote) {
        this(null, title, artist, genre, releaseYear, moodNote, LocalDateTime.now());
    }

    public Song(Long id, String title, String artist, String genre, Integer releaseYear,
                String moodNote, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.artist = artist;
        this.genre = genre;
        this.releaseYear = releaseYear;
        this.moodNote = moodNote;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getArtist() { return artist; }
    public String getGenre() { return genre; }
    public Integer getReleaseYear() { return releaseYear; }
    public String getMoodNote() { return moodNote; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void update(String title, String artist, String genre, Integer releaseYear, String moodNote) {
        this.title = title;
        this.artist = artist;
        this.genre = genre;
        this.releaseYear = releaseYear;
        this.moodNote = moodNote;
    }
}
