package id.moodtune.adapter.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "moodtune_mood_journals")
public class MoodJournalEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 80)
    @Column(name = "mood_label", nullable = false)
    private String moodLabel;

    @Min(1)
    @Max(5)
    @Column(name = "energy_level", nullable = false)
    private int energyLevel = 3;

    @NotBlank
    @Size(max = 2000)
    @Column(nullable = false, length = 2000)
    private String note;

    @ManyToOne
    @JoinColumn(name = "linked_song_id")
    private SongEntity linkedSong;

    @NotNull
    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate = LocalDate.now();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    protected MoodJournalEntity() {
    }

    public static MoodJournalEntity create() {
        return new MoodJournalEntity();
    }

    public void update(String moodLabel, int energyLevel, String note, SongEntity linkedSong, LocalDate entryDate) {
        this.moodLabel = moodLabel;
        this.energyLevel = energyLevel;
        this.note = note;
        this.linkedSong = linkedSong;
        this.entryDate = entryDate;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getMoodLabel() { return moodLabel; }
    public int getEnergyLevel() { return energyLevel; }
    public String getNote() { return note; }
    public SongEntity getLinkedSong() { return linkedSong; }
    public LocalDate getEntryDate() { return entryDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
