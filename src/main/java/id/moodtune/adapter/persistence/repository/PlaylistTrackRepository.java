package id.moodtune.adapter.persistence.repository;

import id.moodtune.adapter.persistence.entity.PlaylistEntity;
import id.moodtune.adapter.persistence.entity.PlaylistTrackEntity;
import id.moodtune.adapter.persistence.entity.SongEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlaylistTrackRepository extends JpaRepository<PlaylistTrackEntity, Long> {
    List<PlaylistTrackEntity> findAllByPlaylistOrderByPositionAscIdAsc(PlaylistEntity playlist);
    Optional<PlaylistTrackEntity> findByPlaylistAndSong(PlaylistEntity playlist, SongEntity song);
    void deleteByPlaylistAndSong(PlaylistEntity playlist, SongEntity song);
    void deleteAllBySong(SongEntity song);
}
