package id.moodtune.adapter.persistence.repository;

import id.moodtune.adapter.persistence.entity.SongEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SongRepository extends JpaRepository<SongEntity, Long> {
    List<SongEntity> findAllByOrderByCreatedAtDescIdDesc();
    java.util.Optional<SongEntity> findFirstByTitleIgnoreCaseAndArtistIgnoreCase(String title, String artist);
}
