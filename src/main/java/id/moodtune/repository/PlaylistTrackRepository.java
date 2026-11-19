package id.moodtune.repository;

import id.moodtune.model.Playlist;
import id.moodtune.model.PlaylistTrack;
import id.moodtune.model.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlaylistTrackRepository extends JpaRepository<PlaylistTrack, Long> {
    List<PlaylistTrack> findAllByPlaylistOrderByPositionAscIdAsc(Playlist playlist);
    Optional<PlaylistTrack> findByPlaylistAndSong(Playlist playlist, Song song);
    void deleteByPlaylistAndSong(Playlist playlist, Song song);
    void deleteAllBySong(Song song);
}
