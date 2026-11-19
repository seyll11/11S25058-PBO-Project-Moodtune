package id.moodtune.repository;

import id.moodtune.model.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SongRepository extends JpaRepository<Song, Long> {
    List<Song> findAllByOrderByCreatedAtDescIdDesc();
    java.util.Optional<Song> findFirstByTitleIgnoreCaseAndArtistIgnoreCase(String title, String artist);
}
