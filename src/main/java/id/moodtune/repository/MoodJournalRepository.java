package id.moodtune.repository;

import id.moodtune.model.MoodJournal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;

public interface MoodJournalRepository extends JpaRepository<MoodJournal, Long> {
    @EntityGraph(attributePaths = "linkedSong")
    List<MoodJournal> findAllByOrderByEntryDateDescIdDesc();

    @EntityGraph(attributePaths = "linkedSong")
    List<MoodJournal> findAllByEntryDateGreaterThanEqualAndEntryDateLessThan(
            java.time.LocalDate start, java.time.LocalDate end);
}
