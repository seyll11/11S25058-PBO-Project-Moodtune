package id.moodtune.adapter.persistence.repository;

import id.moodtune.adapter.persistence.entity.PlaylistEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.Optional;
import java.util.List;

public interface PlaylistRepository extends JpaRepository<PlaylistEntity, Long> {
    @EntityGraph(attributePaths = {"tracks", "tracks.song"})
    Optional<PlaylistEntity> findWithTracksById(Long id);

    @EntityGraph(attributePaths = {"tracks", "tracks.song"})
    List<PlaylistEntity> findAllByOrderByUpdatedAtDescIdDesc();
}
