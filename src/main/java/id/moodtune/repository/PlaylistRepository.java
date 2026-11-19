package id.moodtune.repository;

import id.moodtune.model.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.Optional;
import java.util.List;

public interface PlaylistRepository extends JpaRepository<Playlist, Long> {
    @EntityGraph(attributePaths = {"tracks", "tracks.song"})
    Optional<Playlist> findWithTracksById(Long id);

    @EntityGraph(attributePaths = {"tracks"})
    List<Playlist> findAllByOrderByUpdatedAtDescIdDesc();
}
