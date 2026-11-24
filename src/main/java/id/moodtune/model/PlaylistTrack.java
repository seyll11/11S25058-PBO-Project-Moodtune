package id.moodtune.model;

import java.time.LocalDateTime;

public class PlaylistTrack {
    private final Long id;
    private final Long playlistId;
    private final Song song;
    private int position;
    private final LocalDateTime addedAt;

    public PlaylistTrack(Long playlistId, Song song, int position) {
        this(null, playlistId, song, position, LocalDateTime.now());
    }

    public PlaylistTrack(Long id, Long playlistId, Song song, int position, LocalDateTime addedAt) {
        this.id = id;
        this.playlistId = playlistId;
        this.song = song;
        this.position = position;
        this.addedAt = addedAt;
    }

    public Long getId() { return id; }
    public Long getPlaylistId() { return playlistId; }
    public Song getSong() { return song; }
    public int getPosition() { return position; }
    public LocalDateTime getAddedAt() { return addedAt; }
    public void setPosition(int position) { this.position = position; }
}
