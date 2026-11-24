package id.moodtune.adapter.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "moodtune_playlist_songs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"playlist_id", "song_id"}))
public class PlaylistTrackEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    private PlaylistEntity playlist;

    @ManyToOne(optional = false)
    @JoinColumn(name = "song_id", nullable = false)
    private SongEntity song;

    @Column(nullable = false)
    private int position;

    @Column(name = "added_at", nullable = false)
    private LocalDateTime addedAt = LocalDateTime.now();

    protected PlaylistTrackEntity() {
    }

    public PlaylistTrackEntity(PlaylistEntity playlist, SongEntity song, int position) {
        this.playlist = playlist;
        this.song = song;
        this.position = position;
    }

    public void setPosition(int position) { this.position = position; }
    public Long getId() { return id; }
    public PlaylistEntity getPlaylist() { return playlist; }
    public SongEntity getSong() { return song; }
    public int getPosition() { return position; }
    public LocalDateTime getAddedAt() { return addedAt; }
}
