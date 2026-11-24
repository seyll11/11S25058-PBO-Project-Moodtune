package id.moodtune.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class MoodJournal {
    private final Long id;
    private String moodLabel;
    private int energyLevel;
    private String note;
    private Song linkedSong;
    private LocalDate entryDate;
    private final LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public MoodJournal(String moodLabel, int energyLevel, String note, Song linkedSong, LocalDate entryDate) {
        this(null, moodLabel, energyLevel, note, linkedSong, entryDate, LocalDateTime.now(), LocalDateTime.now());
    }

    public MoodJournal(Long id, String moodLabel, int energyLevel, String note, Song linkedSong,
                       LocalDate entryDate, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.moodLabel = moodLabel;
        this.energyLevel = energyLevel;
        this.note = note;
        this.linkedSong = linkedSong;
        this.entryDate = entryDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void update(String moodLabel, int energyLevel, String note, Song linkedSong, LocalDate entryDate) {
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
    public Song getLinkedSong() { return linkedSong; }
    public LocalDate getEntryDate() { return entryDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
