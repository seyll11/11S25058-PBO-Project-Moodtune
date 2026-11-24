package id.moodtune.adapter.persistence.repository;

import id.moodtune.adapter.persistence.entity.MoodJournalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;

public interface MoodJournalRepository extends JpaRepository<MoodJournalEntity, Long> {
    @EntityGraph(attributePaths = "linkedSong")
    List<MoodJournalEntity> findAllByOrderByEntryDateDescIdDesc();

    @EntityGraph(attributePaths = "linkedSong")
    List<MoodJournalEntity> findAllByEntryDateGreaterThanEqualAndEntryDateLessThan(
            java.time.LocalDate start, java.time.LocalDate end);
}
